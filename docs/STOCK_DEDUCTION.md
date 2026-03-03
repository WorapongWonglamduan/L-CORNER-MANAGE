# ระบบตัดสต็อกอัตโนมัติ (Automatic Stock Deduction)

## ภาพรวม

ระบบจะตัดสต็อกอัตโนมัติเมื่อมีการขายสินค้า โดยวิธีการตัดสต็อกจะแตกต่างกันตามประเภทของสินค้า

## ประเภทสินค้าและการตัดสต็อก

### 1. FINISHED_GOOD (สินค้าสำเร็จรูป)

**วิธีการตัดสต็อก:**
- ตัดสต็อกจากตัวสินค้าเองโดยตรง
- ไม่ตัดสต็อกวัตถุดิบ (เพราะตัดไปตอนผลิตแล้ว)

**ตัวอย่าง:**
```
ขาย: น้ำดื่ม 10 ขวด
ผลลัพธ์: สต็อก "น้ำดื่ม" ลดลง 10 ขวด
```

**Stock Transaction:**
```json
{
  "product_id": "น้ำดื่ม",
  "transaction_type": "sale",
  "quantity": -10,
  "note": "ขายสินค้าสำเร็จรูป: น้ำดื่ม"
}
```

### 2. SEMI_FINISHED (สินค้ากึ่งสำเร็จรูป)

**วิธีการตัดสต็อก:**
- ไม่ตัดสต็อกของตัวสินค้าเอง
- ตัดสต็อกของวัตถุดิบตามสูตร (Recipe)
- ใช้ Default Recipe ที่ active

**ตัวอย่าง:**
```
ขาย: ชาเขียวเย็น 2 แก้ว

สูตร (Recipe):
- ชาเขียว: 10 กรัม/แก้ว
- น้ำตาล: 15 กรัม/แก้ว
- น้ำแข็ง: 200 กรัม/แก้ว
- แก้ว: 1 ใบ/แก้ว

ผลลัพธ์:
- สต็อก "ชาเขียว" ลดลง 20 กรัม (10 × 2)
- สต็อก "น้ำตาล" ลดลง 30 กรัม (15 × 2)
- สต็อก "น้ำแข็ง" ลดลง 400 กรัม (200 × 2)
- สต็อก "แก้ว" ลดลง 2 ใบ (1 × 2)
```

**Stock Transactions:**
```json
[
  {
    "product_id": "ชาเขียว",
    "transaction_type": "sale",
    "quantity": -20,
    "unit_id": "กรัม",
    "note": "ใช้วัตถุดิบสำหรับ ชาเขียวเย็น (2 แก้ว)"
  },
  {
    "product_id": "น้ำตาล",
    "transaction_type": "sale",
    "quantity": -30,
    "unit_id": "กรัม",
    "note": "ใช้วัตถุดิบสำหรับ ชาเขียวเย็น (2 แก้ว)"
  },
  // ... และอื่นๆ
]
```

### 3. RAW_MATERIAL / INGREDIENT (วัตถุดิบ)

**วิธีการตัดสต็อก:**
- ตัดสต็อกจากตัววัตถุดิบเองโดยตรง
- ใช้เมื่อขายวัตถุดิบแบบแยกชิ้น

## API Endpoint

### สร้างการขาย (Create Sale)

**Endpoint:** `POST /api/sales`

**Request Body:**
```json
{
  "customer_id": "uuid-optional",
  "warehouse_id": "uuid-required",
  "items": [
    {
      "product_id": "uuid",
      "product_unit_id": "uuid",
      "recipe_id": "uuid-optional",
      "quantity": 2,
      "unit_price": 45.00,
      "discount_amount": 0,
      "note": "ไม่ใส่น้ำตาล"
    }
  ],
  "discount_amount": 0,
  "tax_rate": 7,
  "payment_method": "cash",
  "note": "หมายเหตุการขาย"
}
```

**Response:**
```json
{
  "id": "sale-uuid",
  "sale_number": "SAL-000001",
  "sale_date": "2026-03-03T15:30:00Z",
  "subtotal": 90.00,
  "discount_amount": 0,
  "tax_rate": 7,
  "tax_amount": 6.30,
  "total_amount": 96.30,
  "payment_method": "cash",
  "payment_status": "paid",
  "status": "completed",
  "items": [...]
}
```

### ดูรายละเอียดการขาย

**Endpoint:** `GET /api/sales/{id}`

### ยกเลิกการขาย (คืนสต็อก)

**Endpoint:** `DELETE /api/sales/{id}`

- เปลี่ยนสถานะเป็น "cancelled"
- คืนสต็อกตามประเภทสินค้า:
  - FINISHED_GOOD: คืนสต็อกให้สินค้า
  - SEMI_FINISHED: คืนสต็อกให้วัตถุดิบทุกตัวตามสูตร

## การตรวจสอบสต็อก

ระบบจะตรวจสอบสต็อกก่อนการขายทุกครั้ง:

1. **FINISHED_GOOD:** ตรวจสอบว่ามีสต็อกสินค้าเพียงพอหรือไม่
2. **SEMI_FINISHED:** ตรวจสอบว่ามีวัตถุดิบทุกตัวในสูตรเพียงพอหรือไม่

หากสต็อกไม่พอ ระบบจะ throw error และไม่สร้างการขาย:

```json
{
  "error": "Insufficient stock for ชาเขียว. Available: 5, Required: 20"
}
```

## Stock Transaction Log

ทุกการเปลี่ยนแปลงสต็อกจะถูกบันทึกใน `stock_transactions`:

```json
{
  "id": "uuid",
  "product_id": "uuid",
  "warehouse_id": "uuid",
  "transaction_type": "sale",
  "quantity": -10,
  "quantity_before": 100,
  "quantity_after": 90,
  "unit_id": "uuid",
  "quantity_in_unit": 10,
  "reference_id": "sale-uuid",
  "reference_type": "sale",
  "note": "ขายสินค้าสำเร็จรูป: น้ำดื่ม",
  "created_by": "user-uuid",
  "created_at": "2026-03-03T15:30:00Z"
}
```

## ตัวอย่างการใช้งาน

### ตัวอย่างที่ 1: ขายสินค้าสำเร็จรูป

```javascript
const response = await fetch('/api/sales', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    warehouse_id: 'warehouse-1',
    items: [
      {
        product_id: 'product-water',
        product_unit_id: 'unit-bottle',
        quantity: 5,
        unit_price: 10.00
      }
    ],
    payment_method: 'cash'
  })
});

// ผลลัพธ์: สต็อก "น้ำดื่ม" ลดลง 5 ขวด
```

### ตัวอย่างที่ 2: ขายสินค้ากึ่งสำเร็จรูป

```javascript
const response = await fetch('/api/sales', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    warehouse_id: 'warehouse-1',
    items: [
      {
        product_id: 'product-green-tea',
        product_unit_id: 'unit-cup',
        quantity: 3,
        unit_price: 45.00
      }
    ],
    payment_method: 'cash'
  })
});

// ผลลัพธ์: 
// - ชาเขียว ลดลง 30 กรัม
// - น้ำตาล ลดลง 45 กรัม
// - น้ำแข็ง ลดลง 600 กรัม
// - แก้ว ลดลง 3 ใบ
```

## หมายเหตุสำคัญ

1. **Transaction Safety:** ทุกการขายใช้ Prisma Transaction เพื่อความปลอดภัย
2. **Stock Validation:** ตรวจสอบสต็อกก่อนการขายเสมอ
3. **Audit Trail:** บันทึก Stock Transaction ทุกครั้งเพื่อตรวจสอบย้อนหลัง
4. **Recipe Requirement:** สินค้า SEMI_FINISHED ต้องมี Default Recipe ที่ active
5. **Cancellation:** การยกเลิกจะคืนสต็อกอัตโนมัติ

## การทดสอบ

### ทดสอบการตัดสต็อก FINISHED_GOOD

1. เช็คสต็อกเริ่มต้น
2. สร้างการขาย
3. ตรวจสอบว่าสต็อกลดลงตามจำนวนที่ขาย
4. ตรวจสอบ Stock Transaction

### ทดสอบการตัดสต็อก SEMI_FINISHED

1. เช็คสต็อกวัตถุดิบทั้งหมดในสูตร
2. สร้างการขาย
3. ตรวจสอบว่าสต็อกวัตถุดิบทุกตัวลดลงตามสูตร
4. ตรวจสอบ Stock Transaction ของแต่ละวัตถุดิบ

### ทดสอบการยกเลิก

1. สร้างการขาย
2. ยกเลิกการขาย
3. ตรวจสอบว่าสต็อกกลับมาเท่าเดิม
4. ตรวจสอบ Stock Transaction ทั้งการขายและการยกเลิก
