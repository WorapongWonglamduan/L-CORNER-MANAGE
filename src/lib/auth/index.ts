import NextAuth from 'next-auth'
import { authConfig } from '../../../auth.config'
import { credentialsProvider } from './credentials-provider'
import { callbacks } from './callbacks'

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [credentialsProvider],
  callbacks,
})

export { getUser } from './get-user'
export { extractUserData } from './extract-user-data'
