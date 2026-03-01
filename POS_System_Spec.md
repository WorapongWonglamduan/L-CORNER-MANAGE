# POS System with Inventory Management
## ระบบจุดขายพร้อมจัดการสต้อกสินค้า

> **Stack:** Next.js 15+ · PostgreSQL 16+ · Prisma · TypeScript 5+ · shadcn/ui · next-intl

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [ประเภทสินค้า (Product Types)](#2-ประเภทสินค้า-product-types)
3. [Database Schema](#3-database-schema)
4. [Prisma Schema](#4-prisma-schema)
5. [Service Layer](#5-service-layer)
6. [Pages & Routes](#6-pages--routes)
7. [API Routes](#7-api-routes)
8. [Seed Data](#8-seed-data)
9. [Key Constraints](#9-key-constraints)

---

## 1. Tech Stack

> ติดตั้ง package เวอร์ชั่นล่าสุดทั้งหมด ไม่ระบุ version เก่า

| Category | Package | Purpose |
|---|---|---|
| Frontend | Next.js 15+ (Turbopack) | App Router, Server Components |
| Language | TypeScript 5+ | Type safety |
| Database | PostgreSQL 16+ | Primary database |
| ORM | Prisma (latest) | Schema & queries |
| Styling | Tailwind CSS v4+ | Utility-first CSS |
| UI | shadcn/ui (latest) | Accessible components |
| State | Zustand v5 | Client state |
| Data Fetching | TanStack Query v5 | Server state & caching |
| i18n | next-intl | Multi-language: `th`, `en` |
| Forms | react-hook-form + zod | Validation |
| Charts | recharts | Dashboard analytics |
| Numbers | decimal.js | Precise financial calculations |
| Dates | date-fns | Date manipulation |
| Auth | NextAuth v5 | Authentication & Authorization |

```bash
npm install next@latest prisma @prisma/client \
  typescript tailwindcss @shadcn/ui \
  zustand @tanstack/react-query \
  next-intl react-hook-form zod @hookform/resolvers \
  recharts decimal.js date-fns \
  next-auth bcryptjs
```

### Form Validation Standard

**ทุกฟอร์มในระบบต้องใช้ `react-hook-form` + `zod`**

```typescript
// Example: Product Form
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const productSchema = z.object({
  code: z.string().min(1, 'กรุณากรอกรหัสสินค้า'),
  name_th: z.string().min(1, 'กรุณากรอกชื่อสินค้า (ไทย)'),
  name_en: z.string().min(1, 'Please enter product name (EN)'),
  category_id: z.string().uuid('กรุณาเลือกหมวดหมู่'),
  product_type: z.enum(['made_to_order', 'finished_good']),
  base_unit_id: z.string().uuid('กรุณาเลือกหน่วยนับ'),
  selling_price: z.number().positive('ราคาต้องมากกว่า 0'),
  cost_price: z.number().positive('ต้นทุนต้องมากกว่า 0'),
  min_stock_level: z.number().min(0).optional(),
})

type ProductFormData = z.infer<typeof productSchema>

export function ProductForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  })

  const onSubmit = async (data: ProductFormData) => {
    // Handle form submission
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

**Key Points:**
- ใช้ `zodResolver` สำหรับ validation
- Error messages รองรับ i18n (ไทย/อังกฤษ)
- Type-safe ด้วย TypeScript
- Validation ทั้ง client-side และ server-side

---

## 2. ประเภทสินค้า (Product Types)

| Feature | `made_to_order` (ปรุงเอง/ชง) | `finished_good` (สำเร็จรูป) |
|---|---|---|
| ตัวอย่าง | ชาเขียว, กาแฟ, เมนูปรุงสด | มาม่าคัพ, น้ำอัดลม, ขนมขบเคี้ยว |
| ติดตามสต้อก | ผ่านวัตถุดิบ (ingredients) | ตัวสินค้าโดยตรง |
| Recipe System | ✅ ต้องการ (สูตรอาหาร) | ❌ ไม่ต้องการ |
| Topping/Add-on | ✅ รองรับ (dynamic per order) | ❌ ไม่รองรับ |
| `track_stock` | `false` | `true` |
| หักสต้อกเมื่อขาย | หักจาก `recipe_ingredients` | หักจาก product โดยตรง |

---

## 3. Database Schema

> **Conventions:**
> - ตัวแปรทั้งหมดใช้ `snake_case`
> - ข้อความที่แสดงผลใช้ `JSONB` i18n: `{"th": "ชื่อไทย", "en": "English Name"}`
> - Soft delete ทุก record ด้วย `deleted_at TIMESTAMP`
> - ใช้ `DECIMAL(15,4)` สำหรับจำนวน, `DECIMAL(15,2)` สำหรับราคา

### 3.1 Users & Authentication

```sql
-- ผู้ใช้งานระบบ
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username   VARCHAR(50) UNIQUE NOT NULL,
  email      VARCHAR(100) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,        -- bcrypt hashed
  full_name  VARCHAR(100) NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- บทบาทผู้ใช้ (Dynamic Roles)
CREATE TABLE roles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(50) UNIQUE NOT NULL,  -- 'admin', 'manager', 'cashier'
  display_name_i18n JSONB NOT NULL,                -- {"th":"ผู้ดูแลระบบ","en":"Administrator"}
  description_i18n  JSONB,
  is_system         BOOLEAN DEFAULT false,         -- system roles ห้ามลบ
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- สิทธิ์การใช้งาน
CREATE TABLE permissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) UNIQUE NOT NULL,  -- 'products.view', 'sales.create'
  display_name_i18n JSONB NOT NULL,
  description_i18n  JSONB,
  module            VARCHAR(50) NOT NULL,          -- 'products', 'sales', 'inventory'
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- ความสัมพันธ์ระหว่าง User และ Role (Many-to-Many)
CREATE TABLE user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- ความสัมพันธ์ระหว่าง Role และ Permission (Many-to-Many)
CREATE TABLE role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);
```

**Default Roles:**
- **Admin** - เข้าถึงทุกฟังก์ชัน รวมถึงการตั้งค่าระบบ
- **Manager** - จัดการสินค้า สต็อก รายงาน
- **Cashier** - ขายสินค้า ดูสต็อก

**Permission Modules:**
- `users` - จัดการผู้ใช้และสิทธิ์
- `products` - จัดการสินค้า หมวดหมู่
- `inventory` - จัดการสต็อก คลังสินค้า
- `sales` - ขายสินค้า คืนสินค้า
- `purchases` - สั่งซื้อสินค้า รับสินค้า
- `reports` - ดูรายงานต่างๆ
- `settings` - ตั้งค่าระบบ

### 3.2 Languages

```sql
CREATE TABLE languages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       VARCHAR(10) UNIQUE NOT NULL, -- 'th', 'en'
  name       VARCHAR(50) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 Units of Measure

```sql
CREATE TABLE units (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_i18n         JSONB NOT NULL,         -- {"th":"กิโลกรัม","en":"Kilogram"}
  abbreviation_i18n JSONB NOT NULL,         -- {"th":"กก.","en":"kg"}
  unit_type         VARCHAR(30),            -- 'weight','volume','quantity','length'
  is_base_unit      BOOLEAN DEFAULT false,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE unit_conversions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_unit_id      UUID NOT NULL REFERENCES units(id),
  to_unit_id        UUID NOT NULL REFERENCES units(id),
  conversion_factor DECIMAL(18,6) NOT NULL, -- 1 from_unit = ? to_unit
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_unit_id, to_unit_id)
);
```

### 3.4 Categories

```sql
-- Tree structure (nested categories)
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_i18n   JSONB NOT NULL,
  parent_id   UUID REFERENCES categories(id),
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### 3.5 Warehouses

```sql
CREATE TABLE warehouses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       VARCHAR(20) UNIQUE NOT NULL,
  name_i18n  JSONB NOT NULL,
  address    TEXT,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.6 Products

```sql
CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                VARCHAR(50) UNIQUE NOT NULL,
  name_i18n           JSONB NOT NULL,
  description_i18n    JSONB,
  category_id         UUID REFERENCES categories(id),
  product_type        VARCHAR(20) NOT NULL
                      CHECK (product_type IN ('finished_good', 'made_to_order')),
  base_unit_id        UUID NOT NULL REFERENCES units(id),
  image_url           TEXT,
  is_active           BOOLEAN DEFAULT true,
  has_serial          BOOLEAN DEFAULT false,
  has_expiry          BOOLEAN DEFAULT false,
  min_stock_level     DECIMAL(15,4) DEFAULT 0,   -- แจ้งเตือนเมื่อต่ำกว่านี้
  low_stock_threshold DECIMAL(15,4) DEFAULT 0,   -- critical level
  track_stock         BOOLEAN DEFAULT true,
  -- made_to_order ตั้งเป็น false แล้ว track ผ่าน ingredients แทน
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW(),
  deleted_at          TIMESTAMP                  -- soft delete
);

-- สินค้า 1 ตัว มีได้หลายหน่วยขาย (ชิ้น / แพ็ค / ลัง)
CREATE TABLE product_units (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID NOT NULL REFERENCES products(id),
  unit_id            UUID NOT NULL REFERENCES units(id),
  is_base_unit       BOOLEAN DEFAULT false,
  is_purchase_unit   BOOLEAN DEFAULT false,
  is_selling_unit    BOOLEAN DEFAULT false,
  barcode            VARCHAR(100),
  selling_price      DECIMAL(15,2),
  cost_price         DECIMAL(15,2),
  conversion_to_base DECIMAL(15,6) DEFAULT 1, -- 1 unit นี้ = ? base unit
  is_active          BOOLEAN DEFAULT true,
  created_at         TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, unit_id)
);
```

### 3.7 Recipe System (made_to_order)

```sql
-- สูตรอาหาร: 1 สินค้า มีได้หลาย recipe (เช่น ไซส์ S/M/L)
CREATE TABLE recipes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id),
  name_i18n       JSONB NOT NULL,   -- {"th":"ไซส์ M","en":"Size M"}
  is_default      BOOLEAN DEFAULT false,
  serving_qty     DECIMAL(15,4) DEFAULT 1,
  serving_unit_id UUID REFERENCES units(id),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- วัตถุดิบในแต่ละสูตร
CREATE TABLE recipe_ingredients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id     UUID NOT NULL REFERENCES recipes(id),
  ingredient_id UUID NOT NULL REFERENCES products(id), -- วัตถุดิบ (product อีกตัว)
  quantity      DECIMAL(15,4) NOT NULL,
  unit_id       UUID NOT NULL REFERENCES units(id),
  base_quantity DECIMAL(15,4),   -- auto-calculated (quantity converted to base unit)
  is_optional   BOOLEAN DEFAULT false,
  note_i18n     JSONB,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### 3.8 Toppings System

```sql
-- ท้อปปิ้ง master (dynamic)
CREATE TABLE toppings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_i18n          JSONB NOT NULL,
  category_id        UUID REFERENCES categories(id),
  ingredient_id      UUID REFERENCES products(id),  -- map ไปยัง stock
  quantity_per_order DECIMAL(15,4) NOT NULL,         -- ใช้วัตถุดิบกี่หน่วยต่อ 1 topping
  unit_id            UUID NOT NULL REFERENCES units(id),
  extra_price        DECIMAL(15,2) DEFAULT 0,
  max_qty            INT DEFAULT 5,                  -- จำกัดสูงสุดต่อ order
  is_active          BOOLEAN DEFAULT true,
  created_at         TIMESTAMP DEFAULT NOW()
);

-- กำหนดว่าสินค้าไหนเพิ่ม topping อะไรได้
CREATE TABLE product_toppings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  topping_id UUID NOT NULL REFERENCES toppings(id),
  is_default BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  UNIQUE(product_id, topping_id)
);
```

### 3.9 Stock

```sql
CREATE TABLE stocks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  quantity     DECIMAL(15,4) NOT NULL DEFAULT 0, -- in base unit เสมอ
  updated_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id)
);

-- transaction_type:
-- 'purchase' | 'sale' | 'sale_return' | 'adjustment_in' | 'adjustment_out'
-- 'transfer_in' | 'transfer_out' | 'ingredient_used' | 'initial'
CREATE TABLE stock_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES products(id),
  warehouse_id     UUID NOT NULL REFERENCES warehouses(id),
  transaction_type VARCHAR(30) NOT NULL,
  quantity         DECIMAL(15,4) NOT NULL,  -- base unit (+เข้า / -ออก)
  quantity_before  DECIMAL(15,4) NOT NULL,  -- snapshot ก่อน
  quantity_after   DECIMAL(15,4) NOT NULL,  -- snapshot หลัง
  unit_id          UUID REFERENCES units(id),
  quantity_in_unit DECIMAL(15,4),
  reference_id     UUID,
  reference_type   VARCHAR(30),             -- 'sale' | 'purchase' | 'adjustment'
  note             TEXT,
  created_by       UUID,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- alert_type: 'low_stock' | 'out_of_stock' | 'expiry'
CREATE TABLE stock_alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  alert_type   VARCHAR(20) NOT NULL,
  current_qty  DECIMAL(15,4),
  threshold    DECIMAL(15,4),
  is_resolved  BOOLEAN DEFAULT false,
  resolved_at  TIMESTAMP,
  created_at   TIMESTAMP DEFAULT NOW()
);
```

### 3.10 Sales

```sql
CREATE TABLE customers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           VARCHAR(20) UNIQUE,
  full_name      VARCHAR(200),
  phone          VARCHAR(20),
  email          VARCHAR(100),
  address        TEXT,
  tax_id         VARCHAR(20),
  loyalty_points INT DEFAULT 0,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number     VARCHAR(50) UNIQUE NOT NULL, -- SO-20240101-0001
  sale_date       TIMESTAMP DEFAULT NOW(),
  customer_id     UUID REFERENCES customers(id),
  warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
  subtotal        DECIMAL(15,2) NOT NULL,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_rate        DECIMAL(5,2) DEFAULT 7,
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  total_amount    DECIMAL(15,2) NOT NULL,
  payment_method  VARCHAR(30),  -- 'cash' | 'card' | 'transfer' | 'mixed'
  payment_status  VARCHAR(20) DEFAULT 'paid',
  status          VARCHAR(20) DEFAULT 'completed',
  cashier_id      UUID,
  note            TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sale_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID NOT NULL REFERENCES sales(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  product_unit_id UUID NOT NULL REFERENCES product_units(id),
  recipe_id       UUID REFERENCES recipes(id), -- สูตรที่ใช้ (made_to_order)
  quantity        DECIMAL(15,4) NOT NULL,
  unit_price      DECIMAL(15,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount    DECIMAL(15,2) NOT NULL,
  cost_price      DECIMAL(15,2),               -- snapshot ต้นทุน ณ เวลาขาย
  base_quantity   DECIMAL(15,4),               -- จำนวนที่หักสต้อก (base unit)
  note            TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ท้อปปิ้งที่เลือกต่อรายการขาย
CREATE TABLE sale_item_toppings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_item_id   UUID NOT NULL REFERENCES sale_items(id),
  topping_id     UUID NOT NULL REFERENCES toppings(id),
  quantity       INT NOT NULL DEFAULT 1,
  unit_price     DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_price    DECIMAL(15,2) NOT NULL DEFAULT 0,
  ingredient_id  UUID REFERENCES products(id),
  ingredient_qty DECIMAL(15,4), -- ปริมาณที่ตัดจาก stock จริง
  created_at     TIMESTAMP DEFAULT NOW()
);
```

### 3.11 Purchase Orders

```sql
CREATE TABLE suppliers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       VARCHAR(20) UNIQUE,
  name       VARCHAR(200) NOT NULL,
  contact    VARCHAR(100),
  phone      VARCHAR(20),
  email      VARCHAR(100),
  address    TEXT,
  tax_id     VARCHAR(20),
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- status: 'pending' | 'ordered' | 'partial' | 'received' | 'cancelled'
CREATE TABLE purchase_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number     VARCHAR(50) UNIQUE NOT NULL,
  order_date    TIMESTAMP DEFAULT NOW(),
  expected_date DATE,
  received_date TIMESTAMP,
  supplier_id   UUID REFERENCES suppliers(id),
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id),
  subtotal      DECIMAL(15,2) NOT NULL,
  tax_amount    DECIMAL(15,2) DEFAULT 0,
  total_amount  DECIMAL(15,2) NOT NULL,
  status        VARCHAR(20) DEFAULT 'pending',
  note          TEXT,
  created_by    UUID,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           UUID NOT NULL REFERENCES purchase_orders(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  product_unit_id UUID NOT NULL REFERENCES product_units(id),
  ordered_qty     DECIMAL(15,4) NOT NULL,
  received_qty    DECIMAL(15,4) DEFAULT 0,
  unit_cost       DECIMAL(15,2) NOT NULL,
  total_cost      DECIMAL(15,2) NOT NULL,
  expiry_date     DATE,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## 4. Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Product {
  id                  String    @id @default(uuid())
  code                String    @unique
  name_i18n           Json
  description_i18n    Json?
  category_id         String?
  product_type        String    // 'finished_good' | 'made_to_order'
  base_unit_id        String
  image_url           String?
  is_active           Boolean   @default(true)
  has_serial          Boolean   @default(false)
  has_expiry          Boolean   @default(false)
  min_stock_level     Decimal   @default(0) @db.Decimal(15, 4)
  low_stock_threshold Decimal   @default(0) @db.Decimal(15, 4)
  track_stock         Boolean   @default(true)
  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt
  deleted_at          DateTime?

  category           Category?          @relation(fields: [category_id], references: [id])
  base_unit          Unit               @relation("BaseUnit", fields: [base_unit_id], references: [id])
  product_units      ProductUnit[]
  recipes            Recipe[]
  stocks             Stock[]
  stock_transactions StockTransaction[]
  sale_items         SaleItem[]
  stock_alerts       StockAlert[]

  @@map("products")
}

model Unit {
  id                UUID     @id @default(uuid())
  name_i18n         Json
  abbreviation_i18n Json
  unit_type         String?
  is_base_unit      Boolean  @default(false)
  is_active         Boolean  @default(true)
  created_at        DateTime @default(now())

  products_as_base   Product[]          @relation("BaseUnit")
  product_units      ProductUnit[]
  recipe_ingredients RecipeIngredient[]
  toppings           Topping[]
  from_conversions   UnitConversion[]   @relation("FromUnit")
  to_conversions     UnitConversion[]   @relation("ToUnit")

  @@map("units")
}

model UnitConversion {
  id                String   @id @default(uuid())
  from_unit_id      String
  to_unit_id        String
  conversion_factor Decimal  @db.Decimal(18, 6)
  is_active         Boolean  @default(true)
  created_at        DateTime @default(now())

  from_unit Unit @relation("FromUnit", fields: [from_unit_id], references: [id])
  to_unit   Unit @relation("ToUnit", fields: [to_unit_id], references: [id])

  @@unique([from_unit_id, to_unit_id])
  @@map("unit_conversions")
}

model Recipe {
  id              String   @id @default(uuid())
  product_id      String
  name_i18n       Json
  is_default      Boolean  @default(false)
  serving_qty     Decimal  @default(1) @db.Decimal(15, 4)
  serving_unit_id String?
  is_active       Boolean  @default(true)
  created_at      DateTime @default(now())

  product     Product            @relation(fields: [product_id], references: [id])
  ingredients RecipeIngredient[]
  sale_items  SaleItem[]

  @@map("recipes")
}

model RecipeIngredient {
  id            String   @id @default(uuid())
  recipe_id     String
  ingredient_id String
  quantity      Decimal  @db.Decimal(15, 4)
  unit_id       String
  base_quantity Decimal? @db.Decimal(15, 4)
  is_optional   Boolean  @default(false)
  note_i18n     Json?
  created_at    DateTime @default(now())

  recipe     Recipe  @relation(fields: [recipe_id], references: [id])
  ingredient Product @relation("IngredientProduct", fields: [ingredient_id], references: [id])
  unit       Unit    @relation(fields: [unit_id], references: [id])

  @@map("recipe_ingredients")
}

model Topping {
  id                 String   @id @default(uuid())
  name_i18n          Json
  category_id        String?
  ingredient_id      String?
  quantity_per_order Decimal  @db.Decimal(15, 4)
  unit_id            String
  extra_price        Decimal  @default(0) @db.Decimal(15, 2)
  max_qty            Int      @default(5)
  is_active          Boolean  @default(true)
  created_at         DateTime @default(now())

  unit               Unit              @relation(fields: [unit_id], references: [id])
  product_toppings   ProductTopping[]
  sale_item_toppings SaleItemTopping[]

  @@map("toppings")
}

model Stock {
  id           String   @id @default(uuid())
  product_id   String
  warehouse_id String
  quantity     Decimal  @default(0) @db.Decimal(15, 4)
  updated_at   DateTime @updatedAt

  product   Product   @relation(fields: [product_id], references: [id])
  warehouse Warehouse @relation(fields: [warehouse_id], references: [id])

  @@unique([product_id, warehouse_id])
  @@map("stocks")
}

model StockTransaction {
  id               String   @id @default(uuid())
  product_id       String
  warehouse_id     String
  transaction_type String
  quantity         Decimal  @db.Decimal(15, 4)
  quantity_before  Decimal  @db.Decimal(15, 4)
  quantity_after   Decimal  @db.Decimal(15, 4)
  unit_id          String?
  quantity_in_unit Decimal? @db.Decimal(15, 4)
  reference_id     String?
  reference_type   String?
  note             String?
  created_by       String?
  created_at       DateTime @default(now())

  product   Product   @relation(fields: [product_id], references: [id])
  warehouse Warehouse @relation(fields: [warehouse_id], references: [id])

  @@map("stock_transactions")
}
```

---

## 5. Service Layer

### 5.1 StockService

```typescript
// lib/services/stock.service.ts
import { prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'

export class StockService {

  // ดึง stock คงเหลือ (คืนค่าในหน่วยที่ต้องการ)
  async getStock(
    product_id: string,
    warehouse_id: string,
    unit_id?: string
  ): Promise<Decimal> {
    const stock = await prisma.stocks.findUnique({
      where: { product_id_warehouse_id: { product_id, warehouse_id } }
    })
    const qty = new Decimal(stock?.quantity ?? 0)
    if (unit_id) {
      return UnitConversionService.fromBaseUnit(qty, unit_id)
    }
    return qty
  }

  // made_to_order: คำนวณว่าทำได้กี่ serving จาก ingredients ที่มี
  async getAvailableServings(
    recipe_id: string,
    warehouse_id: string
  ): Promise<number> {
    const ingredients = await prisma.recipe_ingredients.findMany({
      where: { recipe_id },
      include: {
        ingredient: {
          include: { stocks: { where: { warehouse_id } } }
        }
      }
    })

    const servingsPerIngredient = ingredients
      .filter(ing => !ing.is_optional)
      .map(ing => {
        const available = new Decimal(ing.ingredient.stocks[0]?.quantity ?? 0)
        const required = new Decimal(ing.base_quantity ?? 0)
        if (required.isZero()) return Infinity
        return available.div(required).floor().toNumber()
      })

    return Math.min(...servingsPerIngredient)
  }

  // หักสต้อกเมื่อขาย (ใช้ prisma.$transaction เสมอ)
  async deductOnSale(params: {
    sale_item_id: string
    product_id: string
    quantity: number         // in base unit
    recipe_id: string | null
    toppings: Array<{ topping_id: string; quantity: number }>
    warehouse_id: string
  }): Promise<void> {
    const { sale_item_id, product_id, quantity, recipe_id, toppings, warehouse_id } = params

    await prisma.$transaction(async (tx) => {
      const product = await tx.products.findUnique({ where: { id: product_id } })
      if (!product) throw new Error(`Product ${product_id} not found`)

      if (product.product_type === 'finished_good') {
        await this._deductStock(tx, product_id, quantity, warehouse_id, 'sale', sale_item_id)

      } else if (product.product_type === 'made_to_order' && recipe_id) {
        const ingredients = await tx.recipe_ingredients.findMany({ where: { recipe_id } })
        for (const ing of ingredients) {
          const deduct = new Decimal(ing.base_quantity ?? 0).mul(quantity).toNumber()
          await this._deductStock(tx, ing.ingredient_id, deduct, warehouse_id, 'ingredient_used', sale_item_id)
        }
      }

      // หัก topping ingredients
      for (const t of toppings) {
        const topping = await tx.toppings.findUnique({ where: { id: t.topping_id } })
        if (topping?.ingredient_id) {
          const deduct = new Decimal(topping.quantity_per_order).mul(t.quantity).toNumber()
          await this._deductStock(tx, topping.ingredient_id, deduct, warehouse_id, 'ingredient_used', sale_item_id)
        }
      }
    })

    // เช็ค alert หลังหัก stock
    await this.checkAndCreateAlert(product_id, warehouse_id)
  }

  private async _deductStock(
    tx: any,
    product_id: string,
    quantity: number,
    warehouse_id: string,
    type: string,
    reference_id: string
  ) {
    const stock = await tx.stocks.findUnique({
      where: { product_id_warehouse_id: { product_id, warehouse_id } }
    })
    const before = new Decimal(stock?.quantity ?? 0)
    const after = before.minus(quantity)

    await tx.stocks.upsert({
      where: { product_id_warehouse_id: { product_id, warehouse_id } },
      update: { quantity: after.toNumber() },
      create: { product_id, warehouse_id, quantity: after.toNumber() }
    })

    await tx.stock_transactions.create({
      data: {
        product_id, warehouse_id,
        transaction_type: type,
        quantity: -quantity,
        quantity_before: before.toNumber(),
        quantity_after: after.toNumber(),
        reference_id,
        reference_type: 'sale'
      }
    })
  }

  async checkAndCreateAlert(product_id: string, warehouse_id: string): Promise<void> {
    const [stock, product] = await Promise.all([
      prisma.stocks.findUnique({ where: { product_id_warehouse_id: { product_id, warehouse_id } } }),
      prisma.products.findUnique({ where: { id: product_id } })
    ])
    if (!stock || !product) return

    const qty = new Decimal(stock.quantity)
    let alert_type: string | null = null

    if (qty.lte(0)) {
      alert_type = 'out_of_stock'
    } else if (qty.lte(new Decimal(product.low_stock_threshold))) {
      alert_type = 'low_stock'
    }

    if (alert_type) {
      await prisma.stock_alerts.upsert({
        where: { product_id_warehouse_id_alert_type: { product_id, warehouse_id, alert_type } },
        update: { current_qty: qty.toNumber(), is_resolved: false, resolved_at: null },
        create: { product_id, warehouse_id, alert_type, current_qty: qty.toNumber(), threshold: product.low_stock_threshold }
      })
    }
  }
}
```

### 5.2 RecipeService

```typescript
// lib/services/recipe.service.ts

export class RecipeService {

  // คำนวณต้นทุนสูตรอาหาร
  async calculateRecipeCost(recipe_id: string): Promise<Decimal> {
    const ingredients = await prisma.recipe_ingredients.findMany({
      where: { recipe_id },
      include: {
        ingredient: { include: { product_units: { where: { is_base_unit: true } } } }
      }
    })

    return ingredients.reduce((total, ing) => {
      const cost = new Decimal(ing.ingredient.product_units[0]?.cost_price ?? 0)
      return total.plus(cost.mul(ing.base_quantity ?? 0))
    }, new Decimal(0))
  }

  // Preview วัตถุดิบที่จะใช้ก่อน confirm order
  async previewIngredients(
    recipe_id: string,
    quantity: number,
    toppings: Array<{ topping_id: string; quantity: number }>,
    warehouse_id: string
  ) {
    const ingredients = await prisma.recipe_ingredients.findMany({
      where: { recipe_id },
      include: {
        ingredient: {
          include: {
            stocks: { where: { warehouse_id } },
            product_units: { where: { is_base_unit: true } }
          }
        },
        unit: true
      }
    })

    return ingredients.map(ing => {
      const required = new Decimal(ing.base_quantity ?? 0).mul(quantity)
      const available = new Decimal(ing.ingredient.stocks[0]?.quantity ?? 0)
      return {
        ingredient_name: ing.ingredient.name_i18n,
        required_qty: required.toNumber(),
        available_qty: available.toNumber(),
        unit: ing.unit.abbreviation_i18n,
        is_sufficient: available.gte(required),
        shortage: Decimal.max(0, required.minus(available)).toNumber()
      }
    })
  }
}
```

### 5.3 UnitConversionService

```typescript
// src/lib/services/unit-conversion.service.ts

export class UnitConversionService {

  static async toBaseUnit(quantity: Decimal, product_unit_id: string): Promise<Decimal> {
    const pu = await prisma.product_units.findUnique({ where: { id: product_unit_id } })
    return quantity.mul(pu?.conversion_to_base ?? 1)
  }

  static async fromBaseUnit(base_qty: Decimal, product_unit_id: string): Promise<Decimal> {
    const pu = await prisma.product_units.findUnique({ where: { id: product_unit_id } })
    const factor = new Decimal(pu?.conversion_to_base ?? 1)
    return factor.isZero() ? new Decimal(0) : base_qty.div(factor)
  }
}
```

---

## 6. Project Structure & Routes

### Project Structure

```
l-corner-manage/
├── src/                               # Source directory
│   ├── app/                           # Next.js App Router
│   │   ├── [locale]/                  # i18n routing (th | en)
│   │   │   ├── (auth)/
│   │   │   │   └── login/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx           # Dashboard
│   │   │   │   ├── pos/
│   │   │   │   │   └── page.tsx       # POS Screen
│   │   │   │   ├── products/
│   │   │   │   │   ├── page.tsx       # Product list
│   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx   # Edit product
│   │   │   │   │       └── recipe/page.tsx
│   │   │   │   ├── recipes/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── toppings/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── inventory/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── alerts/page.tsx
│   │   │   │   │   ├── adjust/page.tsx
│   │   │   │   │   └── transactions/page.tsx
│   │   │   │   ├── units/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── purchases/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── reports/
│   │   │   │       └── page.tsx
│   │   │   ├── page.tsx               # Home redirect
│   │   │   └── layout.tsx             # Locale layout
│   │   └── api/                       # API Routes
│   │       └── auth/[...nextauth]/route.ts
│   ├── components/                    # React Components
│   │   ├── auth/
│   │   │   └── login-form.tsx
│   │   ├── ui/                        # shadcn/ui components
│   │   └── language-switcher.tsx
│   ├── lib/                           # Utilities & Services
│   │   ├── prisma.ts                  # Prisma client
│   │   ├── utils.ts                   # Helper functions
│   │   └── services/                  # Business logic
│   │       ├── inventory.service.ts
│   │       ├── sale.service.ts
│   │       └── unit-conversion.service.ts
│   └── types/                         # TypeScript types
│       └── next-auth.d.ts
├── prisma/                            # Database
│   ├── schema.prisma
│   └── seed.ts
├── i18n/                              # Internationalization
│   ├── request.ts
│   └── messages/
│       ├── th.json
│       └── en.json
├── auth.ts                            # NextAuth config
├── auth.config.ts
├── middleware.ts                      # Next.js middleware
├── next.config.ts
├── tsconfig.json                      # TypeScript config
└── package.json
```

### Import Path Aliases

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

// Usage examples:
import { LoginForm } from '@/components/auth/login-form'
import { prisma } from '@/lib/prisma'
import { InventoryService } from '@/lib/services/inventory.service'
```

### POS Screen Components

| Component | Description |
|---|---|
| `ProductCard` | แสดง badge 🟢 พร้อมขาย / 🟡 ใกล้หมด / 🔴 หมดแล้ว |
| `ServingBadge` | made_to_order: แสดง "ทำได้ ~{n} แก้ว" |
| `RecipeSelector` | เลือก size/recipe (S/M/L) + ราคา |
| `ToppingSelector` | Dynamic topping picker + quantity + ราคาเพิ่ม real-time |
| `UnitSelector` | Dropdown เปลี่ยนหน่วยขาย → ราคาอัปเดต auto |
| `Cart` | รายการ + discount + total |
| `PaymentModal` | Cash / Card / Transfer / Mixed |

### Inventory Dashboard Widget

- สินค้าที่ `stock = 0` → out of stock (🔴)
- สินค้าที่ `stock <= low_stock_threshold` → low stock (🟡)
- วัตถุดิบที่เหลือน้อย → กระทบ made_to_order (🟠)
- Estimated servings remaining per made_to_order product

---

## 7. API Routes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sales` | สร้าง sale + หักสต้อก (transaction) |
| `GET` | `/api/sales` | รายการขาย (filter: date, cashier, status) |
| `GET` | `/api/inventory/stock` | stock ทุกสินค้าทุกคลัง |
| `GET` | `/api/inventory/alerts` | low stock / out of stock |
| `GET` | `/api/inventory/serving-capacity` | made_to_order: available servings |
| `GET` | `/api/recipes/[id]/ingredient-preview` | preview วัตถุดิบก่อน order |
| `POST` | `/api/stock/adjust` | ปรับสต้อก manual |
| `POST` | `/api/stock/transfer` | โอนสต้อกระหว่างคลัง |
| `GET` | `/api/products` | `?type=made_to_order\|finished_good` |
| `GET` | `/api/products/search` | `?q=name\|barcode` |
| `GET` | `/api/units` | หน่วยนับทั้งหมด |
| `GET` | `/api/units/conversions` | conversion matrix |
| `GET` | `/api/reports/sales` | รายงานขาย (date range) |
| `GET` | `/api/reports/inventory` | รายงานสต้อก + มูลค่า |
| `GET` | `/api/reports/profit` | P&L (ใช้ cost_price snapshot) |

---

## 8. Seed Data

### Units & Conversions

```typescript
// prisma/seed.ts

const units = [
  // Weight
  { name_i18n: { th: 'กรัม', en: 'Gram' },         abbreviation_i18n: { th: 'ก.', en: 'g' },   unit_type: 'weight', is_base_unit: true },
  { name_i18n: { th: 'กิโลกรัม', en: 'Kilogram' }, abbreviation_i18n: { th: 'กก.', en: 'kg' }, unit_type: 'weight' },
  // Volume
  { name_i18n: { th: 'มิลลิลิตร', en: 'Milliliter' }, abbreviation_i18n: { th: 'มล.', en: 'ml' }, unit_type: 'volume', is_base_unit: true },
  { name_i18n: { th: 'ลิตร', en: 'Liter' },           abbreviation_i18n: { th: 'ล.', en: 'L' },   unit_type: 'volume' },
  // Quantity
  { name_i18n: { th: 'ชิ้น', en: 'Piece' },  abbreviation_i18n: { th: 'ชิ้น', en: 'pcs' }, unit_type: 'quantity', is_base_unit: true },
  { name_i18n: { th: 'โหล', en: 'Dozen' },   abbreviation_i18n: { th: 'โหล', en: 'dz' },   unit_type: 'quantity' },
  { name_i18n: { th: 'แพ็ค', en: 'Pack' },   abbreviation_i18n: { th: 'แพ็ค', en: 'pk' },  unit_type: 'quantity' },
  { name_i18n: { th: 'กล่อง', en: 'Box' },   abbreviation_i18n: { th: 'กล่อง', en: 'box' }, unit_type: 'quantity' },
]

const conversions = [
  { from: 'กิโลกรัม', to: 'กรัม',       factor: 1000 },
  { from: 'ลิตร',     to: 'มิลลิลิตร', factor: 1000 },
  { from: 'โหล',      to: 'ชิ้น',       factor: 12   },
  { from: 'แพ็ค',     to: 'ชิ้น',       factor: 6    },
  { from: 'กล่อง',    to: 'ชิ้น',       factor: 24   },
]
```

### Made-to-Order: ชาเขียว

```typescript
// Product
{
  code: 'BEV-001',
  name_i18n: { th: 'ชาเขียว', en: 'Green Tea' },
  product_type: 'made_to_order',
  track_stock: false,
}

// Recipe: ไซส์ M (default)
{
  name_i18n: { th: 'ไซส์ M', en: 'Size M' },
  is_default: true,
  ingredients: [
    { ingredient: 'ผงชาเขียว', quantity: 15,  unit: 'กรัม'      },
    { ingredient: 'นม UHT',    quantity: 150, unit: 'มิลลิลิตร' },
    { ingredient: 'น้ำเชื่อม', quantity: 20,  unit: 'มิลลิลิตร' },
    { ingredient: 'น้ำแข็ง',   quantity: 200, unit: 'กรัม'      },
  ]
}

// Recipe: ไซส์ L
{
  name_i18n: { th: 'ไซส์ L', en: 'Size L' },
  ingredients: [
    { ingredient: 'ผงชาเขียว', quantity: 20,  unit: 'กรัม'      },
    { ingredient: 'นม UHT',    quantity: 220, unit: 'มิลลิลิตร' },
    { ingredient: 'น้ำเชื่อม', quantity: 30,  unit: 'มิลลิลิตร' },
    { ingredient: 'น้ำแข็ง',   quantity: 250, unit: 'กรัม'      },
  ]
}

// Toppings
[
  { name_i18n: { th: 'วุ้นมะพร้าว', en: 'Coconut Jelly' }, ingredient: 'วุ้นมะพร้าว', quantity_per_order: 30, unit: 'กรัม', extra_price: 10 },
  { name_i18n: { th: 'ไข่มุก', en: 'Tapioca Pearl' },       ingredient: 'ไข่มุก',       quantity_per_order: 40, unit: 'กรัม', extra_price: 10 },
  { name_i18n: { th: 'บุก', en: 'Konjac Jelly' },           ingredient: 'บุก',           quantity_per_order: 30, unit: 'กรัม', extra_price: 10 },
]
```

### Finished Good: มาม่าคัพ

```typescript
{
  code: 'FG-001',
  name_i18n: { th: 'มาม่าคัพ ต้มยำกุ้ง', en: 'Mama Cup Tom Yum' },
  product_type: 'finished_good',
  track_stock: true,
  min_stock_level: 10,      // แจ้งเตือนเมื่อเหลือ 10 ชิ้น
  low_stock_threshold: 5,   // critical เมื่อเหลือ 5 ชิ้น
  units: [
    { unit: 'ชิ้น',  is_base_unit: true,  is_selling_unit: true,   selling_price: 8,   cost_price: 5,   conversion_to_base: 1  },
    { unit: 'แพ็ค',  is_selling_unit: true,                         selling_price: 45,  cost_price: 28,  conversion_to_base: 6  },
    { unit: 'กล่อง', is_purchase_unit: true,                        selling_price: 170, cost_price: 100, conversion_to_base: 24 },
  ]
}
```

---

## 9. Key Constraints

| Rule | Detail |
|---|---|
| **Decimal.js** | ราคา/จำนวนทุกแห่งใช้ `Decimal` ไม่ใช้ `float` |
| **DB Transaction** | Stock deduction ทุกครั้งต้องอยู่ใน `prisma.$transaction()` |
| **Cost Snapshot** | บันทึก `cost_price` ณ เวลาขายใน `sale_items` สำหรับ P&L |
| **Qty Snapshot** | บันทึก `quantity_before` + `quantity_after` ใน `stock_transactions` |
| **Soft Delete** | ทุก record ใช้ `deleted_at` ไม่ hard delete |
| **Log All Movement** | ทุกการเปลี่ยนแปลง stock ต้องบันทึกใน `stock_transactions` |
| **Multi-warehouse** | ทุก stock query ต้องระบุ `warehouse_id` เสมอ |
| **i18n JSONB** | ทุก text ที่แสดงผลต้องใช้ `name_i18n[locale]` ไม่ hardcode |
| **snake_case** | ตัวแปร DB ทั้งหมดใช้ `snake_case` |
| **Latest Packages** | ติดตั้ง package เวอร์ชั่นล่าสุดทุกตัว |

### Build Order

```
1. Units & Conversions
2. Categories & Warehouses
3. Products & Product Units
4. Recipes & Recipe Ingredients     ← made_to_order
5. Toppings & Product Toppings      ← made_to_order
6. Stock & Stock Alerts
7. POS Screen (sale + deduct)
8. Purchase Orders
9. Reports & Dashboard
```

---

*POS System Specification — Next.js + PostgreSQL + Prisma*
