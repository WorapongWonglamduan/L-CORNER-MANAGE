import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { NextAuthConfig } from "next-auth";
import { isLockedOut, recordFailedLogin, clearFailedLogins } from "@/lib/login-lockout";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/th/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  // This app only ever runs self-hosted behind a raw IP:port or the Caddy
  // reverse proxy (never Vercel/another platform with auto host detection) —
  // Auth.js v5 otherwise rejects the request's Host header as untrusted in
  // production, surfacing as a generic "There is a problem with the server
  // configuration" on /api/auth/error instead of a real login attempt.
  trustHost: true,
  // Caddy terminates TLS and forwards plain HTTP internally, so per-request
  // protocol auto-detection is unreliable — specifically, the auth() helper
  // used in Server Components (dashboard, /[locale] root) guessed "http"
  // and looked for the plain cookie name, while the sign-in route handler
  // correctly set the `__Secure-` prefixed one. Result: login "succeeds"
  // (real session cookie set) but every Server Component page bounces back
  // to /login as if logged out. NODE_ENV is production in both the prod and
  // UAT containers (hardcoded in docker-compose.yml) and development for
  // local `npm run dev` (plain http, needs the unprefixed cookie) — forcing
  // it explicitly here makes cookie naming consistent across every code
  // path instead of depending on Auth.js's unreliable per-request guess.
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [],
};

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = loginSchema.safeParse(credentials);
        if (!parsedCredentials.success) return null;

        const { email, password } = parsedCredentials.data;

        if (isLockedOut(email)) return null;

        // Dynamic import to avoid bundling Prisma into Edge Runtime
        const [{ prisma }, bcrypt] = await Promise.all([
          import("./lib/prisma"),
          import("bcryptjs"),
        ]);

        const user = await prisma.user.findUnique({
          where: { email, is_active: true },
          include: {
            user_roles: {
              include: { role: true },
            },
            user_warehouses: {
              select: { warehouse_id: true },
            },
            shop: {
              select: { name_i18n: true, logo_path: true },
            },
          },
        });

        if (!user) {
          recordFailedLogin(email);
          return null;
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);
        if (!passwordsMatch) {
          recordFailedLogin(email);
          return null;
        }

        clearFailedLogins(email);

        const roles = user.user_roles.map((ur) => ur.role.name);
        const allPermissions = user.user_roles.flatMap((ur) =>
          Array.isArray(ur.role.permissions) ? ur.role.permissions : [],
        );
        const uniquePermissions = [...new Set(allPermissions)] as string[];
        const warehouseIds = user.user_warehouses.map((uw) => uw.warehouse_id);

        return {
          id: user.id,
          name: user.full_name,
          email: user.email,
          shop_id: user.shop_id,
          shop_name_i18n: (user.shop?.name_i18n as { th?: string; en?: string } | null) ?? null,
          shop_logo_path: user.shop?.logo_path ?? null,
          is_super_admin: user.is_super_admin,
          roles,
          permissions: uniquePermissions,
          warehouse_ids: warehouseIds,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.shop_id = user.shop_id;
        token.shop_name_i18n = user.shop_name_i18n;
        token.shop_logo_path = user.shop_logo_path;
        token.is_super_admin = user.is_super_admin;
        token.roles = user.roles;
        token.permissions = user.permissions;
        token.warehouse_ids = user.warehouse_ids;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        if (token.id) session.user.id = token.id as string;
        session.user.shop_id = (token.shop_id as string | null) ?? null;
        session.user.shop_name_i18n =
          (token.shop_name_i18n as { th?: string; en?: string } | null) ?? null;
        session.user.shop_logo_path = (token.shop_logo_path as string | null) ?? null;
        session.user.is_super_admin = !!token.is_super_admin;
        if (token.roles) session.user.roles = token.roles as string[];
        if (token.permissions)
          session.user.permissions = token.permissions as string[];
        if (token.warehouse_ids)
          session.user.warehouse_ids = token.warehouse_ids as string[];
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
