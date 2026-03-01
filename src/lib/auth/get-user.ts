import { prisma } from '@/lib/prisma'

export async function getUser(username: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { username, is_active: true },
      include: {
        user_roles: {
          include: {
            role: true,
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
