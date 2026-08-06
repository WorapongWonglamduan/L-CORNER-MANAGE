import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { NextAuthConfig } from "next-auth";
import { isLockedOut, recordFailedLogin, clearFailedLogins } from "@/lib/login-lockout";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Unlike wrong-email/wrong-password (deliberately merged into one generic
// message so a guesser can't tell which is true), a lockout is triggered by
// the account owner's own mistyped attempts, so naming it explicitly is safe
// and helps their UX rather than a real attacker's.
class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}

// How often an already-issued JWT re-syncs roles/permissions/shop/warehouses
// from the DB. Without this, an admin editing another user's role, shop, or
// warehouse assignment only takes effect once that user logs out and back
// in, since the JWT strategy otherwise only reads these fields at sign-in.
const SESSION_REVALIDATE_INTERVAL_MS = 2 * 60 * 1000;

const userSessionInclude = {
  user_roles: { include: { role: true } },
  user_warehouses: { select: { warehouse_id: true } },
  shop: { select: { name_i18n: true, logo_path: true } },
} as const;

type UserWithSessionRelations = {
  shop_id: string | null;
  is_super_admin: boolean;
  user_roles: { role: { name: string; permissions: unknown } }[];
  user_warehouses: { warehouse_id: string }[];
  shop: { name_i18n: unknown; logo_path: string | null } | null;
};

function toSessionFields(user: UserWithSessionRelations) {
  const roles = user.user_roles.map((ur) => ur.role.name);
  const allPermissions = user.user_roles.flatMap((ur) =>
    Array.isArray(ur.role.permissions) ? ur.role.permissions : [],
  );
  const permissions = [...new Set(allPermissions)] as string[];
  const warehouse_ids = user.user_warehouses.map((uw) => uw.warehouse_id);

  return {
    shop_id: user.shop_id,
    shop_name_i18n: (user.shop?.name_i18n as { th?: string; en?: string } | null) ?? null,
    shop_logo_path: user.shop?.logo_path ?? null,
    is_super_admin: user.is_super_admin,
    roles,
    permissions,
    warehouse_ids,
  };
}

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

        if (isLockedOut(email)) throw new AccountLockedError();

        // Dynamic import to avoid bundling Prisma into Edge Runtime
        const [{ prisma }, bcrypt] = await Promise.all([
          import("./lib/prisma"),
          import("bcryptjs"),
        ]);

        const user = await prisma.user.findUnique({
          where: { email, is_active: true },
          include: userSessionInclude,
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

        return {
          id: user.id,
          name: user.full_name,
          email: user.email,
          ...toSessionFields(user),
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
        token.checkedAt = Date.now();
        return token;
      }

      const checkedAt = token.checkedAt ?? 0;
      if (Date.now() - checkedAt < SESSION_REVALIDATE_INTERVAL_MS) {
        return token;
      }

      // Dynamic import to avoid bundling Prisma into Edge Runtime
      const { prisma } = await import("./lib/prisma");
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id, is_active: true },
        include: userSessionInclude,
      });

      // Deactivated or deleted since the token was issued — sign them out
      // instead of letting them keep operating on stale roles/permissions.
      if (!dbUser) return null;

      const fields = toSessionFields(dbUser);
      token.shop_id = fields.shop_id;
      token.shop_name_i18n = fields.shop_name_i18n;
      token.shop_logo_path = fields.shop_logo_path;
      token.is_super_admin = fields.is_super_admin;
      token.roles = fields.roles;
      token.permissions = fields.permissions;
      token.warehouse_ids = fields.warehouse_ids;
      token.checkedAt = Date.now();
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
