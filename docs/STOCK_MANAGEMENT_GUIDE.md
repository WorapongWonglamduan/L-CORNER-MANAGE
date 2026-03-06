# คู่มือการทำหน้าจัดการสต็อก (Stock Management)

## ภาพรวม

ระบบมีการจัดการสต็อกอยู่แล้วใน 2 ส่วน:
1. **สต็อกวัตถุดิบ** - ใน Product model (type = raw_material)
2. **สต็อกสินค้า** - ใน Product model (type = finished_good, semi_finished)

การหักสต็อกทำงานอัตโนมัติเมื่อมีการขายผ่าน `/api/sales` route

## โครงสร้างข้อมูลที่มีอยู่

### Product Model
```prisma
model Product {
  current_stock       Decimal   @default(0) @db.Decimal(15, 4)
  min_stock_level     Decimal   @default(0) @db.Decimal(15, 4)
  low_stock_threshold Decimal   @default(0) @db.Decimal(15, 4)
  track_stock         Boolean   @default(true)
}
```

## แนวทางการสร้างหน้าจัดการสต็อก

### 1. สร้างหน้า Inventory Management

#### ไฟล์ที่ต้องสร้าง:

**หน้า List:**
- `src/app/[locale]/inventory/page.tsx`
- `src/components/pages/inventory/index.tsx`
- `src/components/pages/inventory/helper.tsx`

**API Endpoints ที่ต้องสร้าง:**
- `src/app/api/inventory/route.ts` - GET (ดูรายการสต็อก)
- `src/app/api/inventory/adjust/route.ts` - POST (ปรับสต็อก)
- `src/app/api/inventory/history/route.ts` - GET (ประวัติการเปลี่ยนแปลง)

### 2. ฟีเจอร์ที่ควรมี

#### 2.1 แสดงรายการสต็อก
```typescript
// Features:
- แสดงรายการสินค้าทั้งหมดพร้อมสต็อกปัจจุบัน
- กรองตามประเภท (วัตถุดิบ / สินค้าสำเร็จรูป / สินค้ากึ่งสำเร็จรูป)
- แสดงสถานะสต็อก (ปกติ / ต่ำ / หมด)
- ค้นหาตามชื่อ/รหัสสินค้า
- เรียงตามสต็อกต่ำสุด
```

#### 2.2 ปรับสต็อก (Stock Adjustment)
```typescript
// Types of adjustment:
- เพิ่มสต็อก (Stock In) - รับสินค้าเข้า
- ลดสต็อก (Stock Out) - เบิกสินค้า, เสียหาย, หมดอายุ
- ปรับยอด (Adjustment) - นับสต็อกใหม่
```

#### 2.3 ประวัติการเปลี่ยนแปลง (Stock History)
```typescript
// Track:
- วันที่/เวลา
- ประเภทการเปลี่ยนแปลง (ขาย, ปรับเพิ่ม, ปรับลด)
- จำนวนก่อน/หลัง
- ผู้ทำรายการ
- หมายเหตุ
```

### 3. ตัวอย่าง API Endpoint

#### GET /api/inventory
```typescript
// Query params:
- page, pageSize (pagination)
- search (ค้นหา)
- type (raw_material, finished_good, semi_finished)
- stockStatus (all, low, out)

// Response:
{
  items: [
    {
      id: string,
      code: string,
      name_i18n: { th: string, en: string },
      product_type: { type: string },
      current_stock: number,
      min_stock_level: number,
      low_stock_threshold: number,
      base_unit: { name_i18n, abbreviation_i18n },
      stockStatus: "normal" | "low" | "out"
    }
  ],
  total: number,
  lowStockCount: number,
  outOfStockCount: number
}
```

#### POST /api/inventory/adjust
```typescript
// Body:
{
  product_id: string,
  adjustment_type: "in" | "out" | "adjustment",
  quantity: number,
  reason: string,
  note?: string
}

// Action:
1. อัพเดท current_stock
2. บันทึกประวัติ (ถ้าต้องการ tracking)
3. ส่งการแจ้งเตือนถ้าสต็อกต่ำ
```

### 4. UI Components ที่แนะนำ

#### Stock Status Badge
```tsx
const getStockStatus = (current: number, threshold: number, min: number) => {
  if (current <= 0) return { label: "หมด", color: "red" }
  if (current <= threshold) return { label: "ต่ำ", color: "orange" }
  if (current <= min) return { label: "ใกล้หมด", color: "yellow" }
  return { label: "ปกติ", color: "green" }
}
```

#### Stock Adjustment Modal
```tsx
- Input: จำนวนที่ต้องการปรับ
- Select: ประเภทการปรับ (เพิ่ม/ลด/ปรับยอด)
- Textarea: เหตุผล/หมายเหตุ
- แสดงยอดก่อน-หลังการปรับ
```

### 5. การแจ้งเตือนสต็อกต่ำ

สามารถใช้ข้อมูลจาก Dashboard API ที่สร้างไว้แล้ว:
```typescript
// ใน /api/dashboard/stats มีการนับสต็อกต่ำแล้ว
const lowStockItems = await prisma.product.count({
  where: {
    is_active: true,
    deleted_at: null,
    track_stock: true,
    current_stock: {
      lte: prisma.product.fields.low_stock_threshold,
    },
  },
});
```

### 6. ตัวอย่างโครงสร้างหน้า Inventory

```
┌─────────────────────────────────────────────────┐
│ 📦 จัดการสต็อกสินค้า                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ [ค้นหา...] [ประเภท▼] [สถานะ▼] [+ ปรับสต็อก]  │
│                                                 │
│ ┌───────────────────────────────────────────┐   │
│ │ รหัส │ ชื่อ │ ประเภท │ สต็อก │ สถานะ │ ... │   │
│ ├───────────────────────────────────────────┤   │
│ │ P001 │ กาแฟ │ สำเร็จ  │ 50    │ ปกติ  │ ... │   │
│ │ RM01 │ นม   │ วัตถุดิบ│ 5     │ ต่ำ   │ ... │   │
│ └───────────────────────────────────────────┘   │
│                                                 │
│ [< ก่อนหน้า] หน้า 1/10 [ถัดไป >]              │
└─────────────────────────────────────────────────┘
```

### 7. ขั้นตอนการพัฒนา

1. **สร้าง API Endpoints** (ประมาณ 2-3 ชั่วโมง)
   - GET /api/inventory (list + filter)
   - POST /api/inventory/adjust (ปรับสต็อก)
   - GET /api/inventory/history (ถ้าต้องการ tracking)

2. **สร้าง Helper Hook** (1 ชั่วโมง)
   - useInventory() - จัดการ state, fetch data, filters

3. **สร้าง UI Components** (3-4 ชั่วโมง)
   - InventoryList - ตารางแสดงรายการ
   - StockAdjustmentModal - ฟอร์มปรับสต็อก
   - StockStatusBadge - แสดงสถานะ
   - FilterBar - กรองข้อมูล

4. **เพิ่ม Translations** (30 นาที)
   - เพิ่ม keys ใน th.json, en.json

5. **Testing** (1 ชั่วโมง)
   - ทดสอบการปรับสต็อก
   - ทดสอบการกรอง/ค้นหา
   - ทดสอบ edge cases

### 8. Optional Features (ขั้นสูง)

- **Stock Transfer** - โอนสต็อกระหว่างคลัง
- **Barcode Scanning** - สแกนบาร์โค้ดเพื่อปรับสต็อก
- **Stock Alerts** - แจ้งเตือนอัตโนมัติเมื่อสต็อกต่ำ
- **Stock Reports** - รายงานการเคลื่อนไหวสต็อก
- **Batch/Lot Tracking** - ติดตาม lot/batch สินค้า
- **Expiry Date Tracking** - ติดตามวันหมดอายุ

## สรุป

ระบบมีโครงสร้างพื้นฐานสำหรับจัดการสต็อกอยู่แล้ว เพียงแค่สร้าง UI และ API endpoints เพิ่มเติมเพื่อให้ผู้ใช้สามารถ:
1. ดูรายการสต็อกทั้งหมด
2. ปรับเพิ่ม/ลดสต็อก
3. ดูประวัติการเปลี่ยนแปลง
4. รับการแจ้งเตือนเมื่อสต็อกต่ำ

การหักสต็อกอัตโนมัติเมื่อขายสินค้าทำงานอยู่แล้วใน `/api/sales` route
