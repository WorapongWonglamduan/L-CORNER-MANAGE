# คู่มือการใช้งานระบบจัดการสต็อก

## 🎯 ภาพรวม

ระบบจัดการสต็อกที่พัฒนาขึ้นประกอบด้วย 3 ส่วนหลัก:

### 1. **Stock Adjustment Modal** - ปรับสต็อกสินค้า
### 2. **Low Stock Alert** - แจ้งเตือนสต็อกต่ำ
### 3. **Pagination System** - ระบบแบ่งหน้าที่สวยงาม

---

## 📦 1. Stock Adjustment Modal

### ฟีเจอร์

✅ **3 ประเภทการปรับสต็อก:**
- **เพิ่มสต็อก (Stock In)** - รับสินค้าเข้า
- **ลดสต็อก (Stock Out)** - เบิกสินค้า, สินค้าเสียหาย
- **ปรับยอด (Adjustment)** - นับสต็อกใหม่

✅ **UI/UX Features:**
- แสดงสต็อกปัจจุบันและสต็อกใหม่แบบ Real-time
- เปลี่ยนสีตามประเภทการปรับ (เขียว/ส้ม/น้ำเงิน)
- แจ้งเตือนเมื่อสต็อกจะติดลบ
- Dropdown เหตุผลที่ใช้บ่อย
- ช่องหมายเหตุเพิ่มเติม

### วิธีใช้งาน

```tsx
import { StockAdjustmentModal } from "@/components/ui/stock-adjustment-modal";

function ProductPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleAdjustStock = (product) => {
    setSelectedProduct({
      id: product.id,
      name: product.name_i18n.th,
      code: product.code,
      current_stock: product.current_stock,
      unit: product.base_unit.abbreviation_i18n.th,
    });
    setIsModalOpen(true);
  };

  return (
    <>
      <button onClick={() => handleAdjustStock(product)}>
        ปรับสต็อก
      </button>

      <StockAdjustmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        onSuccess={() => {
          // Refresh data
          refetchProducts();
        }}
      />
    </>
  );
}
```

### API Endpoint ที่ต้องสร้าง

**POST /api/inventory/adjust**

```typescript
// Request Body
{
  product_id: string;
  adjustment_type: "in" | "out" | "adjustment";
  quantity: number;
  reason: string;
  note?: string;
}

// Response
{
  success: true;
  new_stock: number;
}
```

**ตัวอย่าง Implementation:**

```typescript
// src/app/api/inventory/adjust/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { product_id, adjustment_type, quantity, reason, note } = await request.json();

    // Validate
    if (!product_id || !adjustment_type || !quantity || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get current product
    const product = await prisma.product.findUnique({
      where: { id: product_id },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Calculate new stock
    let new_stock = product.current_stock;
    if (adjustment_type === "in") {
      new_stock = Number(product.current_stock) + Number(quantity);
    } else if (adjustment_type === "out") {
      new_stock = Number(product.current_stock) - Number(quantity);
    } else {
      new_stock = Number(quantity);
    }

    // Validate new stock
    if (new_stock < 0) {
      return NextResponse.json(
        { error: "Stock cannot be negative" },
        { status: 400 }
      );
    }

    // Update stock
    const updatedProduct = await prisma.product.update({
      where: { id: product_id },
      data: { current_stock: new_stock },
    });

    // Optional: Log the adjustment in a separate table
    // await prisma.stockAdjustment.create({
    //   data: {
    //     product_id,
    //     adjustment_type,
    //     quantity,
    //     old_stock: product.current_stock,
    //     new_stock,
    //     reason,
    //     note,
    //     created_by: session.user.id,
    //   },
    // });

    return NextResponse.json({
      success: true,
      new_stock: updatedProduct.current_stock,
    });
  } catch (error) {
    console.error("Error adjusting stock:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

## 🔔 2. Low Stock Alert System

### ฟีเจอร์

✅ **การแจ้งเตือนอัจฉริยะ:**
- ตรวจสอบสต็อกอัตโนมัติทุก 5 นาที
- แสดง popup ที่มุมล่างขวา
- แสดงสินค้าสต็อกต่ำสูงสุด 5 รายการ
- Progress bar แสดงเปอร์เซ็นต์สต็อกที่เหลือ
- สีเตือนแบบ 2 ระดับ (ส้ม: <100%, แดง: <50%)

✅ **UX ที่ดี:**
- ปิดชั่วคราวได้ (จะกลับมาแจ้งอีกครั้งใน 1 ชั่วโมง)
- คลิกดูรายการเต็มได้ทันที
- Animation สวยงาม
- Responsive

### วิธีใช้งาน

**เพิ่มใน Layout หลัก:**

```tsx
// src/app/[locale]/layout.tsx
import { LowStockAlert } from "@/components/ui/low-stock-alert";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <LowStockAlert />
      </body>
    </html>
  );
}
```

### API Endpoint ที่ต้องสร้าง

**GET /api/inventory/low-stock**

```typescript
// src/app/api/inventory/low-stock/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const lowStockItems = await prisma.product.findMany({
      where: {
        is_active: true,
        deleted_at: null,
        track_stock: true,
        current_stock: {
          lte: prisma.product.fields.low_stock_threshold,
        },
      },
      select: {
        id: true,
        code: true,
        name_i18n: true,
        current_stock: true,
        low_stock_threshold: true,
        base_unit: {
          select: {
            abbreviation_i18n: true,
          },
        },
        product_type: {
          select: {
            type: true,
          },
        },
      },
      orderBy: {
        current_stock: "asc", // สต็อกน้อยที่สุดก่อน
      },
      take: 20, // จำกัดไม่เกิน 20 รายการ
    });

    const items = lowStockItems.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name_i18n.th,
      current_stock: Number(item.current_stock),
      low_stock_threshold: Number(item.low_stock_threshold),
      unit: item.base_unit.abbreviation_i18n.th,
      product_type: item.product_type.type,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching low stock items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

## 📄 3. Pagination System

### ฟีเจอร์

✅ **Pagination Component ที่สมบูรณ์:**
- แสดงเลขหน้าแบบ Smart (1 ... 5 6 7 ... 20)
- เลือกจำนวนรายการต่อหน้าได้ (5, 10, 20, 50)
- แสดงจำนวนรายการทั้งหมด
- Responsive (ซ่อนข้อความบางส่วนบนมือถือ)
- Disable ปุ่มอัตโนมัติเมื่อถึงหน้าแรก/สุดท้าย

### วิธีใช้งาน

```tsx
import { Pagination } from "@/components/ui/pagination";

function DataList() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  return (
    <>
      {/* Your data table */}
      
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        itemsPerPage={pageSize}
        totalItems={totalItems}
        onItemsPerPageChange={setPageSize}
      />
    </>
  );
}
```

---

## 🎨 การใช้งานร่วมกัน

### ตัวอย่าง: หน้า Inventory Management

```tsx
// src/app/[locale]/inventory/page.tsx
"use client";

import { useState } from "react";
import { StockAdjustmentModal } from "@/components/ui/stock-adjustment-modal";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const handleAdjustStock = (product) => {
    setSelectedProduct({
      id: product.id,
      name: product.name_i18n.th,
      code: product.code,
      current_stock: Number(product.current_stock),
      unit: product.base_unit.abbreviation_i18n.th,
    });
    setIsAdjustModalOpen(true);
  };

  return (
    <div>
      <h1>จัดการสต็อก</h1>
      
      {/* Product Table */}
      <table>
        <thead>
          <tr>
            <th>รหัส</th>
            <th>ชื่อสินค้า</th>
            <th>สต็อก</th>
            <th>สถานะ</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.code}</td>
              <td>{product.name_i18n.th}</td>
              <td>
                {Number(product.current_stock)} {product.base_unit.abbreviation_i18n.th}
              </td>
              <td>
                {Number(product.current_stock) <= Number(product.low_stock_threshold) && (
                  <span className="text-red-600">สต็อกต่ำ</span>
                )}
              </td>
              <td>
                <Button onClick={() => handleAdjustStock(product)}>
                  ปรับสต็อก
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        itemsPerPage={pageSize}
        totalItems={totalItems}
        onItemsPerPageChange={setPageSize}
      />

      {/* Stock Adjustment Modal */}
      {selectedProduct && (
        <StockAdjustmentModal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          product={selectedProduct}
          onSuccess={() => {
            // Refresh products
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}
```

---

## 🚀 Performance Optimizations

### 1. **React.memo** ใน DateRangePicker
- ป้องกัน re-render ที่ไม่จำเป็น
- ใช้ `useCallback` สำหรับ handlers
- ใช้ `useMemo` สำหรับ date presets

### 2. **Debounce** ใน Search
- ลด API calls จาก every keystroke เหลือ 500ms หลังพิมพ์เสร็จ
- ประหยัด bandwidth และ server load

### 3. **Smart Polling** ใน Low Stock Alert
- ตรวจสอบทุก 5 นาที (ไม่บ่อยเกินไป)
- หยุดการแจ้งเตือนชั่วคราวเมื่อ dismiss
- ใช้ `useCallback` เพื่อป้องกัน infinite loop

### 4. **Pagination**
- Load เฉพาะข้อมูลที่ต้องการแสดง
- ลด memory usage
- เร็วขึ้นเมื่อข้อมูลเยอะ

---

## 📍 ตำแหน่งที่แจ้งเตือนสต็อกต่ำ

### แนะนำให้แสดงที่:

1. **Dashboard** - แสดงจำนวนสต็อกต่ำใน stat card
2. **Navbar** - Badge แจ้งเตือนจำนวนสินค้าสต็อกต่ำ
3. **Floating Alert** - Popup มุมล่างขวา (ที่สร้างไว้แล้ว)
4. **Product List** - Highlight สินค้าที่สต็อกต่ำด้วยสี
5. **POS** - แจ้งเตือนเมื่อขายสินค้าที่เหลือน้อย

### ตัวอย่าง: เพิ่มใน Navbar

```tsx
// src/components/navbar.tsx
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

export function Navbar() {
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    const fetchLowStockCount = async () => {
      const res = await fetch("/api/inventory/low-stock");
      const data = await res.json();
      setLowStockCount(data.items?.length || 0);
    };
    
    fetchLowStockCount();
    const interval = setInterval(fetchLowStockCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav>
      {/* ... other nav items ... */}
      
      {lowStockCount > 0 && (
        <Link href="/inventory" className="relative">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {lowStockCount}
          </span>
        </Link>
      )}
    </nav>
  );
}
```

---

## ✅ Checklist การ Implement

### Phase 1: API Endpoints
- [ ] สร้าง `/api/inventory/adjust` (POST)
- [ ] สร้าง `/api/inventory/low-stock` (GET)
- [ ] สร้าง `/api/inventory` (GET) - list all products with stock
- [ ] (Optional) สร้าง table `stock_adjustment_log` สำหรับ audit trail

### Phase 2: UI Components
- [x] StockAdjustmentModal
- [x] LowStockAlert
- [x] Pagination
- [x] DateRangePicker
- [ ] Inventory List Page

### Phase 3: Integration
- [ ] เพิ่ม LowStockAlert ใน Layout
- [ ] เพิ่ม stock badge ใน Navbar
- [ ] เพิ่มปุ่ม "ปรับสต็อก" ในหน้า Product List
- [ ] สร้างหน้า Inventory Management

### Phase 4: Testing
- [ ] ทดสอบการเพิ่มสต็อก
- [ ] ทดสอบการลดสต็อก
- [ ] ทดสอบการปรับยอด
- [ ] ทดสอบการแจ้งเตือนสต็อกต่ำ
- [ ] ทดสอบ pagination

---

## 🎯 สรุป

ระบบที่สร้างขึ้นมีครบทั้ง:
- ✅ UI/UX สวยงามและใช้งานง่าย
- ✅ Performance ดี (memo, callback, debounce)
- ✅ Responsive design
- ✅ Real-time updates
- ✅ Error handling
- ✅ Accessibility (aria-labels)

พร้อมใช้งานเมื่อสร้าง API endpoints เสร็จ! 🚀
