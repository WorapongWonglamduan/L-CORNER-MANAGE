# Migration Guide: Simplified Role/Permission Structure

## Overview
เปลี่ยนจาก 4 tables (User, Role, Permission, UserRole, RolePermission) เป็น 2 tables (User, Role) โดยเก็บ permissions เป็น JSONB

## Changes Summary

### Before (4 tables)
- `users` - ผู้ใช้
- `roles` - บทบาท
- `permissions` - สิทธิ์
- `user_roles` - many-to-many ระหว่าง users ↔ roles
- `role_permissions` - many-to-many ระหว่าง roles ↔ permissions

### After (2 tables)
- `users` - ผู้ใช้ (มี `role_id` ชี้ไปที่ role เดียว)
- `roles` - บทบาท (มี `permissions` เป็น JSONB array)

## Migration Steps

### 1. Backup ข้อมูลเดิม (สำคัญมาก!)

```sql
-- Backup existing data
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE roles_backup AS SELECT * FROM roles;
CREATE TABLE permissions_backup AS SELECT * FROM permissions;
CREATE TABLE user_roles_backup AS SELECT * FROM user_roles;
CREATE TABLE role_permissions_backup AS SELECT * FROM role_permissions;
```

### 2. สร้าง temporary table สำหรับ migrate ข้อมูล

```sql
-- Create temp table to store role permissions as JSONB
CREATE TEMP TABLE role_permissions_json AS
SELECT 
  r.id as role_id,
  r.name as role_name,
  COALESCE(
    jsonb_agg(p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL),
    '[]'::jsonb
  ) as permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
GROUP BY r.id, r.name;

-- Create temp table to assign single role to each user
CREATE TEMP TABLE user_single_role AS
SELECT DISTINCT ON (u.id)
  u.id as user_id,
  ur.role_id
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY u.id, ur.created_at ASC; -- เลือก role แรกที่ assign
```

### 3. Drop old tables และ constraints

```sql
-- Drop junction tables
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
```

### 4. Modify existing tables

```sql
-- Add role_id to users table
ALTER TABLE users ADD COLUMN role_id UUID;

-- Update users with their role
UPDATE users u
SET role_id = usr.role_id
FROM user_single_role usr
WHERE u.id = usr.user_id;

-- Make role_id NOT NULL after data migration
ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE users 
ADD CONSTRAINT fk_users_role 
FOREIGN KEY (role_id) REFERENCES roles(id);

-- Add permissions column to roles
ALTER TABLE roles ADD COLUMN permissions JSONB DEFAULT '[]'::jsonb;

-- Update roles with their permissions
UPDATE roles r
SET permissions = rpj.permissions
FROM role_permissions_json rpj
WHERE r.id = rpj.role_id;
```

### 5. Generate Prisma Client

```bash
npm run db:generate
```

## Example: Role Permissions Structure

```json
{
  "role": "admin",
  "permissions": [
    "users.create",
    "users.read",
    "users.update",
    "users.delete",
    "products.create",
    "products.read",
    "products.update",
    "products.delete",
    "sales.create",
    "sales.read",
    "inventory.manage"
  ]
}
```

## Example: Creating New Role

```typescript
// Create admin role with permissions
await prisma.role.create({
  data: {
    name: 'admin',
    display_name_i18n: {
      en: 'Administrator',
      th: 'ผู้ดูแลระบบ'
    },
    permissions: [
      'users.create',
      'users.read',
      'users.update',
      'users.delete',
      'products.manage',
      'sales.manage',
      'inventory.manage',
      'reports.view'
    ],
    is_system: true,
  }
})

// Create user with role
await prisma.user.create({
  data: {
    username: 'admin',
    email: 'admin@example.com',
    password: hashedPassword,
    full_name: 'System Admin',
    role_id: adminRole.id,
  }
})
```

## Checking Permissions in Code

```typescript
// Old way (complex)
const hasPermission = user.user_roles.some(ur => 
  ur.role.role_permissions.some(rp => 
    rp.permission.name === 'products.create'
  )
)

// New way (simple)
const hasPermission = user.role.permissions.includes('products.create')
```

## Rollback Plan

หากต้องการ rollback:

```sql
-- Restore from backup
DROP TABLE users CASCADE;
DROP TABLE roles CASCADE;

CREATE TABLE users AS SELECT * FROM users_backup;
CREATE TABLE roles AS SELECT * FROM roles_backup;
CREATE TABLE permissions AS SELECT * FROM permissions_backup;
CREATE TABLE user_roles AS SELECT * FROM user_roles_backup;
CREATE TABLE role_permissions AS SELECT * FROM role_permissions_backup;

-- Restore constraints (ต้องสร้างใหม่ตาม schema เดิม)
```

## Notes

- ⚠️ **User จะมีได้แค่ 1 role** - ถ้าต้องการหลาย roles ต้องใช้โครงสร้างอื่น
- ✅ **Performance ดีขึ้น** - ลด JOIN จาก 4 tables เหลือ 1 table
- ✅ **Code ง่ายขึ้น** - Query และ logic ง่ายกว่าเดิมมาก
- ✅ **Flexible** - เพิ่ม/ลด permissions ได้ง่ายผ่าน JSONB
