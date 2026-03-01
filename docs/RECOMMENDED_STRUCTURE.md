# โครงสร้าง Role/Permission ที่แนะนำ (3 Tables)

## 🎯 แนวคิด: เก็บ Permissions เป็น JSONB แต่ User มีหลาย Roles ได้

```
User ──┬── Role 1 (permissions: JSONB)
       ├── Role 2 (permissions: JSONB)
       └── Role 3 (permissions: JSONB)
```

---

## 📋 โครงสร้าง 3 Tables

### 1. **users** - ข้อมูลผู้ใช้
```sql
id          UUID
username    VARCHAR
email       VARCHAR
password    VARCHAR
full_name   VARCHAR
is_active   BOOLEAN
created_at  TIMESTAMP
```

### 2. **roles** - บทบาทพร้อม permissions
```sql
id                  UUID
name                VARCHAR         -- 'admin', 'cashier', 'inventory_manager'
display_name_i18n   JSONB          -- {"en": "Admin", "th": "ผู้ดูแลระบบ"}
permissions         JSONB          -- ["products.create", "sales.read", ...]
is_system           BOOLEAN
is_active           BOOLEAN
created_at          TIMESTAMP
```

### 3. **user_roles** - ความสัมพันธ์ User ↔ Roles
```sql
id          UUID
user_id     UUID  → users.id
role_id     UUID  → roles.id
created_at  TIMESTAMP

UNIQUE(user_id, role_id)
```

---

## 💡 ทำไมถึงดีกว่า?

### ✅ ข้อดี

1. **User มีหลาย Roles ได้**
   ```typescript
   น้องแอน = [Cashier, Inventory Manager]
   พี่เจน = [Manager, Cashier, Report Viewer]
   ```

2. **Permissions เก็บใน Role เป็น JSONB** (ไม่ต้องมี Permission table)
   ```json
   {
     "name": "cashier",
     "permissions": [
       "sales.create",
       "sales.read",
       "products.read",
       "customers.read"
     ]
   }
   ```

3. **Query ง่ายและเร็ว** (JOIN แค่ 2 tables)
   ```typescript
   const user = await prisma.user.findUnique({
     where: { username },
     include: { user_roles: { include: { role: true } } }
   })
   ```

4. **จัดการ Permissions ง่าย**
   ```typescript
   // เพิ่ม permission ให้ role
   await prisma.role.update({
     where: { name: 'cashier' },
     data: {
       permissions: ['sales.create', 'sales.read', 'products.read', 'inventory.update']
     }
   })
   ```

5. **เพิ่ม/ลด Role ให้ User ง่าย**
   ```typescript
   // เพิ่ม role
   await prisma.userRole.create({
     data: { user_id: userId, role_id: inventoryRoleId }
   })
   
   // ลบ role
   await prisma.userRole.delete({
     where: { user_id_role_id: { user_id: userId, role_id: cashierRoleId } }
   })
   ```

---

## 📊 เปรียบเทียบกับโครงสร้างอื่น

| Feature | 4 Tables (เก่า) | 2 Tables | **3 Tables (แนะนำ)** |
|---------|----------------|----------|---------------------|
| User มีหลาย Roles | ✅ | ❌ | ✅ |
| Query ง่าย | ❌ (JOIN 4-5 tables) | ✅ (JOIN 1) | ✅ (JOIN 2) |
| Performance | ⚠️ ช้า | ✅ เร็ว | ✅ เร็ว |
| จัดการ Permissions | ⚠️ ซับซ้อน | ✅ ง่าย | ✅ ง่าย |
| Flexible | ✅ สูงสุด | ❌ ต่ำ | ✅ สูง |
| เข้าใจง่าย | ❌ | ✅ | ✅ |

---

## 🔧 Prisma Schema

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

  user_roles UserRole[]
  created_sales Sale[] @relation("SaleCreatedBy")
  created_purchase_orders PurchaseOrder[] @relation("PurchaseOrderCreatedBy")
  stock_transactions StockTransaction[] @relation("StockTransactionCreatedBy")

  @@map("users")
}

model Role {
  id                String   @id @default(uuid())
  name              String   @unique
  display_name_i18n Json
  description_i18n  Json?
  permissions       Json     @default("[]")
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

---

## 💻 ตัวอย่างการใช้งาน

### 1. สร้าง Roles พร้อม Permissions

```typescript
// Admin Role
const adminRole = await prisma.role.create({
  data: {
    name: 'admin',
    display_name_i18n: {
      en: 'Administrator',
      th: 'ผู้ดูแลระบบ'
    },
    permissions: [
      'users.create', 'users.read', 'users.update', 'users.delete',
      'products.create', 'products.read', 'products.update', 'products.delete',
      'sales.create', 'sales.read', 'sales.update', 'sales.delete',
      'inventory.create', 'inventory.read', 'inventory.update', 'inventory.delete',
      'reports.view', 'settings.manage'
    ],
    is_system: true
  }
})

// Cashier Role
const cashierRole = await prisma.role.create({
  data: {
    name: 'cashier',
    display_name_i18n: {
      en: 'Cashier',
      th: 'แคชเชียร์'
    },
    permissions: [
      'sales.create', 'sales.read',
      'products.read',
      'customers.read', 'customers.create'
    ]
  }
})

// Inventory Manager Role
const inventoryRole = await prisma.role.create({
  data: {
    name: 'inventory_manager',
    display_name_i18n: {
      en: 'Inventory Manager',
      th: 'ผู้จัดการสต็อก'
    },
    permissions: [
      'products.create', 'products.read', 'products.update',
      'inventory.create', 'inventory.read', 'inventory.update',
      'purchase_orders.create', 'purchase_orders.read'
    ]
  }
})
```

### 2. สร้าง User พร้อม Roles

```typescript
// น้องแอน = Cashier + Inventory Manager
const user = await prisma.user.create({
  data: {
    username: 'ann',
    email: 'ann@example.com',
    password: hashedPassword,
    full_name: 'น้องแอน',
    user_roles: {
      create: [
        { role_id: cashierRole.id },
        { role_id: inventoryRole.id }
      ]
    }
  },
  include: {
    user_roles: {
      include: { role: true }
    }
  }
})
```

### 3. ดึงข้อมูล User พร้อม Permissions

```typescript
export async function getUser(username: string) {
  const user = await prisma.user.findUnique({
    where: { username, is_active: true },
    include: {
      user_roles: {
        include: { role: true }
      }
    }
  })
  
  if (!user) return null
  
  // รวม permissions จากทุก roles
  const allPermissions = user.user_roles.flatMap(ur => 
    Array.isArray(ur.role.permissions) ? ur.role.permissions : []
  )
  
  // ลบ permissions ซ้ำ
  const uniquePermissions = [...new Set(allPermissions)]
  
  return {
    ...user,
    permissions: uniquePermissions
  }
}
```

### 4. ตรวจสอบ Permission

```typescript
function hasPermission(user: User, permission: string): boolean {
  return user.permissions.includes(permission)
}

// ใช้งาน
if (hasPermission(user, 'products.create')) {
  // อนุญาตให้สร้างสินค้า
}
```

### 5. เพิ่ม/ลด Role

```typescript
// เพิ่ม role ให้ user
await prisma.userRole.create({
  data: {
    user_id: user.id,
    role_id: managerRole.id
  }
})

// ลบ role ออกจาก user
await prisma.userRole.delete({
  where: {
    user_id_role_id: {
      user_id: user.id,
      role_id: cashierRole.id
    }
  }
})
```

---

## 🎨 ตัวอย่างข้อมูลจริง

### Roles Table
```json
[
  {
    "id": "uuid-1",
    "name": "admin",
    "display_name_i18n": {"en": "Administrator", "th": "ผู้ดูแลระบบ"},
    "permissions": ["users.*", "products.*", "sales.*", "inventory.*", "reports.*"]
  },
  {
    "id": "uuid-2",
    "name": "cashier",
    "display_name_i18n": {"en": "Cashier", "th": "แคชเชียร์"},
    "permissions": ["sales.create", "sales.read", "products.read", "customers.read"]
  },
  {
    "id": "uuid-3",
    "name": "inventory_manager",
    "display_name_i18n": {"en": "Inventory Manager", "th": "ผู้จัดการสต็อก"},
    "permissions": ["products.create", "products.read", "inventory.*", "purchase_orders.*"]
  }
]
```

### User_Roles Table
```json
[
  {"user_id": "ann-id", "role_id": "uuid-2"},  // น้องแอน = Cashier
  {"user_id": "ann-id", "role_id": "uuid-3"},  // น้องแอน = Inventory Manager
  {"user_id": "jane-id", "role_id": "uuid-1"}, // พี่เจน = Admin
  {"user_id": "jane-id", "role_id": "uuid-2"}  // พี่เจน = Cashier (ช่วยขาย)
]
```

### ผลลัพธ์เมื่อ Query
```typescript
// น้องแอน
{
  id: "ann-id",
  username: "ann",
  full_name: "น้องแอน",
  roles: ["cashier", "inventory_manager"],
  permissions: [
    "sales.create", "sales.read", "products.read", "customers.read",
    "products.create", "inventory.*", "purchase_orders.*"
  ]
}
```

---

## 🚀 Migration จากโครงสร้างเก่า

```sql
-- 1. เพิ่ม permissions column ใน roles table
ALTER TABLE roles ADD COLUMN permissions JSONB DEFAULT '[]'::jsonb;

-- 2. Migrate permissions จาก role_permissions table
UPDATE roles r
SET permissions = (
  SELECT jsonb_agg(p.name ORDER BY p.name)
  FROM role_permissions rp
  JOIN permissions p ON rp.permission_id = p.id
  WHERE rp.role_id = r.id
);

-- 3. Drop permission table (เก็บ user_roles ไว้)
DROP TABLE role_permissions CASCADE;
DROP TABLE permissions CASCADE;
```

---

## ✅ สรุป

### โครงสร้างนี้ให้คุณ:
- ✅ **ยืดหยุ่น** - User มีหลาย roles ได้
- ✅ **เร็ว** - Query แค่ 2 tables
- ✅ **เข้าใจง่าย** - โครงสร้างชัดเจน
- ✅ **จัดการง่าย** - Permissions อยู่ใน role เป็น JSONB
- ✅ **Scalable** - รองรับระบบโต

### เหมาะกับ:
- ระบบ POS ที่พนักงานทำหลายหน้าที่
- ระบบขนาดเล็ก-กลาง (< 100 users)
- ต้องการ performance ดีและ code maintain ง่าย
