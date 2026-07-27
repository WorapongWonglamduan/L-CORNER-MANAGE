import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      roles: string[]
      permissions: string[]
      warehouse_ids: string[]
    } & DefaultSession['user']
  }

  interface User {
    id: string
    roles: string[]
    permissions: string[]
    warehouse_ids: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    roles: string[]
    permissions: string[]
    warehouse_ids: string[]
  }
}
