import type { Session, User } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

export const callbacks = {
  async jwt({ token, user }: { token: JWT; user?: User }) {
    if (user) {
      token.id = user.id
      token.roles = user.roles
      token.permissions = user.permissions
    }
    return token
  },
  
  async session({ session, token }: { session: Session; token: JWT }) {
    if (token && session.user) {
      if (token.id) session.user.id = token.id as string
      if (token.roles) session.user.roles = token.roles as string[]
      if (token.permissions) session.user.permissions = token.permissions as string[]
    }
    return session
  },
}
