import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'
import { prisma } from './src/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

async function getUser(username: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { username, is_active: true },
      include: {
        user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })
    return user
  } catch (error) {
    console.error('Failed to fetch user:', error)
    throw new Error('Failed to fetch user.')
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ username: z.string(), password: z.string().min(6) })
          .safeParse(credentials)

        if (parsedCredentials.success) {
          const { username, password } = parsedCredentials.data
          const user = await getUser(username)
          if (!user) return null

          const passwordsMatch = await bcrypt.compare(password, user.password)

          if (passwordsMatch) {
            // Extract roles and permissions
            const roles = user.user_roles.map((ur: any) => ur.role.name)
            const permissions = user.user_roles.flatMap((ur: any) => 
              ur.role.role_permissions.map((rp: any) => rp.permission.name)
            )
            const uniquePermissions = [...new Set(permissions)] as string[]

            return {
              id: user.id,
              name: user.full_name,
              email: user.email,
              roles: roles,
              permissions: uniquePermissions,
            }
          }
        }

        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.roles = user.roles
        token.permissions = user.permissions
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.roles = token.roles as string[]
        session.user.permissions = token.permissions as string[]
      }
      return session
    },
  },
})
