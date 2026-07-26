# Auth & Role/Permission Structure

> Merged from the former `RECOMMENDED_STRUCTURE.md` (design rationale) and `IMPLEMENTATION_SUMMARY.md` ("as built" notes) — they were a matched design/implementation pair with duplicated content. The former `MIGRATION_GUIDE.md` proposed a *2-table* alternative (`User` with a single `role_id`) that was **not** chosen; it's archived at `docs/archive/MIGRATION_GUIDE.md` for historical context only — do not follow it, the schema below is what's actually implemented.
>
> Verified against the current `prisma/schema.prisma` and `auth.ts` as of this writing — the Prisma sample below has the stale `created_purchase_orders`/`stock_transactions` relations from the original doc removed (those models don't exist in this schema).

## Concept: permissions live on the Role, users can hold multiple Roles

```
User ──┬── Role 1 (permissions: JSONB)
       ├── Role 2 (permissions: JSONB)
       └── Role 3 (permissions: JSONB)
```

## The 3 Tables

1. **`users`** — user accounts
2. **`roles`** — a role plus its `permissions` as a JSONB array (no separate `Permission` table)
3. **`user_roles`** — many-to-many join between users and roles

### Comparison against alternatives considered

| Feature | 4 Tables (original design) | 2 Tables (`MIGRATION_GUIDE.md`, rejected) | **3 Tables (implemented)** |
|---|---|---|---|
| User can hold multiple roles | ✅ | ❌ | ✅ |
| Query simplicity | ❌ (join 4-5 tables) | ✅ (join 1) | ✅ (join 2) |
| Permission management | ⚠️ complex | ✅ simple | ✅ simple |
| Flexibility | ✅ highest | ❌ low | ✅ high |

## Prisma Schema (as implemented)

```prisma
model User {
  id         String    @id @default(uuid())
  username   String    @unique
  email      String    @unique
  password   String
  full_name  String
  is_active  Boolean   @default(true)
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt

  user_roles    UserRole[]
  created_sales Sale[]     @relation("SaleCreatedBy")

  @@map("users")
}

model Role {
  id                String   @id @default(uuid())
  name              String   @unique
  display_name_i18n Json
  description_i18n  Json?
  permissions       Json     @default("[]") // JSONB array of permission strings
  is_system         Boolean  @default(false)
  is_active         Boolean  @default(true)
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  user_roles UserRole[]

  @@map("roles")
}

model UserRole {
  id         String   @id @default(uuid())
  user_id    String
  role_id    String
  created_at DateTime @default(now())

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)
  role Role @relation(fields: [role_id], references: [id], onDelete: Cascade)

  @@unique([user_id, role_id])
  @@map("user_roles")
}
```

Note: `UserRole.user_id`/`role_id` aren't individually indexed beyond the `@@unique([user_id, role_id])` compound index — Postgres can use that as a leftmost index for `user_id` lookups, but a lookup by `role_id` alone (e.g. "everyone with this role") does a full scan. Add `@@index([role_id])` if that query pattern shows up.

## Where the Logic Actually Lives

Unlike the original design doc's suggested split (`src/lib/auth/get-user.ts`, `extract-user-data.ts`, `callbacks.ts` — **none of these files exist**), the current implementation keeps everything inline in a single file:

**`auth.ts`** (project root, NextAuth v5 config):
- `Credentials` provider's `authorize()` looks up the user by `username`, includes `user_roles.role`, checks the password with `bcryptjs`
- Flattens roles to `string[]` and merges+dedupes all `role.permissions` from every held role into a single `permissions: string[]`
- `jwt`/`session` callbacks copy `id`, `roles`, `permissions` onto the token and then the session
- Uses dynamic `import()` for `prisma` and `bcryptjs` specifically so they aren't bundled into the Edge runtime (this file is also imported by `src/proxy.ts` middleware, which runs on Edge)

**`src/types/next-auth.d.ts`** — module augmentation adding `id`, `roles: string[]`, `permissions: string[]` to `Session.user` and `User`.

## Usage Examples

### Seed roles with permissions

```typescript
const adminRole = await prisma.role.create({
  data: {
    name: 'admin',
    display_name_i18n: { en: 'Administrator', th: 'ผู้ดูแลระบบ' },
    permissions: [
      'users.create', 'users.read', 'users.update', 'users.delete',
      'products.create', 'products.read', 'products.update', 'products.delete',
      'sales.create', 'sales.read', 'sales.update', 'sales.delete',
      'inventory.manage', 'reports.view', 'settings.manage',
    ],
    is_system: true,
  },
})
```

### Create a user with multiple roles

```typescript
// A cashier who also manages inventory
const user = await prisma.user.create({
  data: {
    username: 'ann',
    email: 'ann@example.com',
    password: await bcrypt.hash('password123', 10),
    full_name: 'น้องแอน',
    user_roles: {
      create: [
        { role_id: cashierRole.id },
        { role_id: inventoryRole.id },
      ],
    },
  },
})
```

### Fetch a user with merged permissions

```typescript
export async function getUser(username: string) {
  const user = await prisma.user.findUnique({
    where: { username, is_active: true },
    include: { user_roles: { include: { role: true } } },
  })
  if (!user) return null

  const allPermissions = user.user_roles.flatMap((ur) =>
    Array.isArray(ur.role.permissions) ? ur.role.permissions : []
  )
  return { ...user, permissions: [...new Set(allPermissions)] }
}
```

### Check a permission

```typescript
function hasPermission(user: { permissions: string[] }, permission: string): boolean {
  return user.permissions.includes(permission)
}
```

### Add / remove a role from a user

```typescript
// Add
await prisma.userRole.create({ data: { user_id: user.id, role_id: managerRole.id } })

// Remove
await prisma.userRole.delete({
  where: { user_id_role_id: { user_id: user.id, role_id: cashierRole.id } },
})
```

## Why This Design

- Supports staff who wear multiple hats (cashier + inventory manager)
- Only 2 joins to resolve a user's full permission set (`User` → `UserRole` → `Role`)
- Permissions are edited in one place (`Role.permissions` JSONB) without a separate permissions table
- Appropriate scale for a small-to-medium POS deployment (well under 100 users)
