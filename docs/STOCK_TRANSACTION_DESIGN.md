# Stock Transaction Logging Design

## 🎯 วัตถุประสงค์

เก็บประวัติการเปลี่ยนแปลงสต็อกทุกครั้ง เพื่อ:
- ✅ Audit trail - ตรวจสอบย้อนหลังได้
- ✅ รู้ว่าใครปรับสต็อกเมื่อไหร่
- ✅ วิเคราะห์การใช้วัตถุดิบ
- ✅ ตรวจสอบความผิดพลาด

---

## 📊 Table Design

### **1. StockAdjustment** (การปรับสต็อกด้วยตัวเอง)

```prisma
model StockAdjustment {
  id              String   @id @default(uuid())
  product_id      String
  adjustment_type String   // "in" (เพิ่ม), "out" (ลด), "adjustment" (ปรับยอด)
  quantity        Decimal  @db.Decimal(15, 4)
  old_stock       Decimal  @db.Decimal(15, 4)
  new_stock       Decimal  @db.Decimal(15, 4)
  reason          String   // "รับสินค้าเข้า", "เบิกสินค้า", "สินค้าเสียหาย", etc.
  note            String?  @db.Text
  created_by      String
  created_at      DateTime @default(now())

  product     Product @relation(fields: [product_id], references: [id])
  created_by_user User @relation(fields: [created_by], references: [id])

  @@index([product_id])
  @@index([created_by])
  @@index([created_at])
  @@map("stock_adjustments")
}
```

**ใช้เมื่อ:**
- ปรับสต็อกผ่าน Stock Adjustment Modal
- รับสินค้าเข้า
- เบิกสินค้า
- นับสต็อกใหม่
- สินค้าเสียหาย/หมดอายุ

---

### **2. StockTransaction** (ทุก transaction ที่เกี่ยวกับสต็อก)

```prisma
model StockTransaction {
  id                String   @id @default(uuid())
  product_id        String
  transaction_type  String   // "sale", "adjustment", "recipe_deduction", "initial"
  reference_type    String?  // "sale", "sale_item", "stock_adjustment"
  reference_id      String?  // ID ของ sale, sale_item, หรือ stock_adjustment
  quantity_change   Decimal  @db.Decimal(15, 4) // บวก = เพิ่ม, ลบ = ลด
  old_stock         Decimal  @db.Decimal(15, 4)
  new_stock         Decimal  @db.Decimal(15, 4)
  note              String?  @db.Text
  created_by        String?
  created_at        DateTime @default(now())

  product         Product @relation(fields: [product_id], references: [id])
  created_by_user User?   @relation(fields: [created_by], references: [id])

  @@index([product_id])
  @@index([transaction_type])
  @@index([reference_type, reference_id])
  @@index([created_at])
  @@map("stock_transactions")
}
```

**ใช้เมื่อ:**
- ขายสินค้า (ลดสต็อก)
- ใช้วัตถุดิบในสูตร (ลดสต็อก)
- ปรับสต็อกด้วยตัวเอง (เพิ่ม/ลด)
- ตั้งค่าสต็อกเริ่มต้น

---

## 🔄 แนวทางการใช้งาน

### **Option 1: ใช้แค่ StockAdjustment** (แนะนำสำหรับเริ่มต้น)

**ข้อดี:**
- ✅ เรียบง่าย
- ✅ เก็บเฉพาะการปรับสต็อกที่ทำเอง
- ✅ ไม่ซับซ้อน

**ข้อเสีย:**
- ❌ ไม่เห็นประวัติการขายที่ลดสต็อก
- ❌ ไม่เห็นการใช้วัตถุดิบในสูตร

**เหมาะกับ:** ระบบเล็ก ต้องการแค่เก็บว่าใครปรับสต็อกเมื่อไหร่

---

### **Option 2: ใช้ทั้ง StockAdjustment + StockTransaction** (แนะนำสำหรับระบบใหญ่)

**ข้อดี:**
- ✅ เห็นประวัติทุก transaction
- ✅ วิเคราะห์ได้ละเอียด
- ✅ Audit trail สมบูรณ์

**ข้อเสีย:**
- ❌ ซับซ้อนกว่า
- ❌ ต้องเขียนโค้ดเพิ่ม

**เหมาะกับ:** ระบบที่ต้องการ audit trail ครบถ้วน

---

## 📝 Migration SQL

### **Option 1: StockAdjustment Only**

```sql
-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "adjustment_type" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "old_stock" DECIMAL(15,4) NOT NULL,
    "new_stock" DECIMAL(15,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_adjustments_product_id_idx" ON "stock_adjustments"("product_id");
CREATE INDEX "stock_adjustments_created_by_idx" ON "stock_adjustments"("created_by");
CREATE INDEX "stock_adjustments_created_at_idx" ON "stock_adjustments"("created_at");

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_product_id_fkey" 
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

### **Option 2: Both Tables**

```sql
-- CreateTable StockAdjustment (same as above)

-- CreateTable StockTransaction
CREATE TABLE "stock_transactions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "quantity_change" DECIMAL(15,4) NOT NULL,
    "old_stock" DECIMAL(15,4) NOT NULL,
    "new_stock" DECIMAL(15,4) NOT NULL,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_transactions_product_id_idx" ON "stock_transactions"("product_id");
CREATE INDEX "stock_transactions_transaction_type_idx" ON "stock_transactions"("transaction_type");
CREATE INDEX "stock_transactions_reference_type_reference_id_idx" ON "stock_transactions"("reference_type", "reference_id");
CREATE INDEX "stock_transactions_created_at_idx" ON "stock_transactions"("created_at");

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_product_id_fkey" 
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

---

## 💻 API Implementation

### **POST /api/inventory/adjust** (with logging)

```typescript
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { product_id, adjustment_type, quantity, reason, note } = await request.json();

  try {
    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get current product
      const product = await tx.product.findUnique({
        where: { id: product_id },
      });

      if (!product) {
        throw new Error("Product not found");
      }

      // 2. Calculate new stock
      const oldStock = Number(product.current_stock);
      let newStock = oldStock;

      if (adjustment_type === "in") {
        newStock = oldStock + Number(quantity);
      } else if (adjustment_type === "out") {
        newStock = oldStock - Number(quantity);
      } else if (adjustment_type === "adjustment") {
        newStock = Number(quantity);
      }

      if (newStock < 0) {
        throw new Error("Stock cannot be negative");
      }

      // 3. Update product stock
      const updatedProduct = await tx.product.update({
        where: { id: product_id },
        data: { current_stock: newStock },
      });

      // 4. Log to StockAdjustment
      await tx.stockAdjustment.create({
        data: {
          product_id,
          adjustment_type,
          quantity: Number(quantity),
          old_stock: oldStock,
          new_stock: newStock,
          reason,
          note,
          created_by: session.user.id,
        },
      });

      // 5. (Optional) Log to StockTransaction
      await tx.stockTransaction.create({
        data: {
          product_id,
          transaction_type: "adjustment",
          reference_type: "stock_adjustment",
          reference_id: null, // Will be set after stockAdjustment is created
          quantity_change: adjustment_type === "out" ? -Number(quantity) : Number(quantity),
          old_stock: oldStock,
          new_stock: newStock,
          note: `${reason}${note ? `: ${note}` : ""}`,
          created_by: session.user.id,
        },
      });

      return updatedProduct;
    });

    return NextResponse.json({
      success: true,
      new_stock: result.current_stock,
    });
  } catch (error) {
    console.error("Error adjusting stock:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

## 📈 Query Examples

### **ดูประวัติการปรับสต็อกของสินค้า**

```typescript
const adjustments = await prisma.stockAdjustment.findMany({
  where: { product_id: "xxx" },
  include: {
    created_by_user: {
      select: { full_name: true, username: true },
    },
  },
  orderBy: { created_at: "desc" },
  take: 20,
});
```

### **ดูประวัติทั้งหมด (รวมการขาย)**

```typescript
const transactions = await prisma.stockTransaction.findMany({
  where: { product_id: "xxx" },
  include: {
    created_by_user: {
      select: { full_name: true },
    },
  },
  orderBy: { created_at: "desc" },
  take: 50,
});
```

### **รายงานการใช้วัตถุดิบ (ช่วงเวลา)**

```typescript
const usage = await prisma.stockTransaction.groupBy({
  by: ["product_id"],
  where: {
    transaction_type: "recipe_deduction",
    created_at: {
      gte: startDate,
      lte: endDate,
    },
  },
  _sum: {
    quantity_change: true,
  },
});
```

---

## ✅ สรุปคำแนะนำ

### **สำหรับระบบของคุณ แนะนำ Option 1: StockAdjustment Only**

**เหตุผล:**
1. ✅ เริ่มต้นง่าย ไม่ซับซ้อน
2. ✅ เก็บประวัติการปรับสต็อกที่สำคัญ
3. ✅ ตอบโจทย์ audit trail พื้นฐาน
4. ✅ ขยายเป็น Option 2 ได้ภายหลัง

**ถ้าอนาคตต้องการ:**
- เห็นประวัติการขายที่ลดสต็อก
- วิเคราะห์การใช้วัตถุดิบ
- Audit trail แบบละเอียด

→ ค่อยเพิ่ม StockTransaction ทีหลัง

---

## 🚀 Next Steps

1. เพิ่ม `StockAdjustment` model ใน schema.prisma
2. Run migration
3. Update API `/api/inventory/adjust` ให้บันทึก log
4. (Optional) สร้างหน้าดูประวัติการปรับสต็อก
