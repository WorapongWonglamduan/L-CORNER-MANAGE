import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getUser } from './get-user'
import { extractUserData } from './extract-user-data'

const loginSchema = z.object({
  username: z.string(),
  password: z.string().min(6),
})

export const credentialsProvider = Credentials({
  async authorize(credentials) {
    const parsedCredentials = loginSchema.safeParse(credentials)

    if (!parsedCredentials.success) {
      return null
    }

    const { username, password } = parsedCredentials.data
    const user = await getUser(username)
    
    if (!user) {
      return null
    }

    const passwordsMatch = await bcrypt.compare(password, user.password)

    if (!passwordsMatch) {
      return null
    }

    return extractUserData(user)
  },
})
