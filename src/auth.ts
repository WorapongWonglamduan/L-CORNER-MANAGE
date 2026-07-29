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
        token.roles = user.roles;
        token.permissions = user.permissions;
        token.warehouse_ids = user.warehouse_ids;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        if (token.id) session.user.id = token.id as string;
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
