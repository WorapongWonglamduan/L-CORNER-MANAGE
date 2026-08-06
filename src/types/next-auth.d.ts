import { DefaultSession } from 'next-auth'

type ShopNameI18n = { th?: string; en?: string } | null

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      shop_id: string | null
      shop_name_i18n: ShopNameI18n
      shop_logo_path: string | null
      is_super_admin: boolean
      roles: string[]
      permissions: string[]
      warehouse_ids: string[]
    } & DefaultSession['user']
  }

  interface User {
    id: string
    shop_id: string | null
    shop_name_i18n: ShopNameI18n
    shop_logo_path: string | null
    is_super_admin: boolean
    roles: string[]
    permissions: string[]
    warehouse_ids: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    shop_id: string | null
    shop_name_i18n: ShopNameI18n
    shop_logo_path: string | null
    is_super_admin: boolean
    roles: string[]
    permissions: string[]
    warehouse_ids: string[]
    /** Epoch ms the token's roles/permissions/shop were last re-synced from the DB. */
    checkedAt?: number
  }
}
