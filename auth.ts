import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { NextAuthConfig } from "next-auth";

const loginSchema = z.object({
  username: z.string(),
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

        const { username, password } = parsedCredentials.data;

        // Dynamic import to avoid bundling Prisma into Edge Runtime
        const [{ prisma }, bcrypt] = await Promise.all([
          import("./src/lib/prisma"),
          import("bcryptjs"),
        ]);

        const user = await prisma.user.findUnique({
          where: { username, is_active: true },
          include: {
            user_roles: {
              include: { role: true },
            },
          },
        });

        if (!user) return null;

        const passwordsMatch = await bcrypt.compare(password, user.password);
        if (!passwordsMatch) return null;

        const roles = user.user_roles.map((ur) => ur.role.name);
        const allPermissions = user.user_roles.flatMap((ur) =>
          Array.isArray(ur.role.permissions) ? ur.role.permissions : [],
        );
        const uniquePermissions = [...new Set(allPermissions)] as string[];

        return {
          id: user.id,
          name: user.full_name,
          email: user.email,
          roles,
          permissions: uniquePermissions,
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        if (token.id) session.user.id = token.id as string;
        if (token.roles) session.user.roles = token.roles as string[];
        if (token.permissions)
          session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
