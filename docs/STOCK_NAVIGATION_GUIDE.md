# คู่มือการเข้าถึงระบบจัดการสต็อก

## 🗺️ แผนผังการเข้าถึง (Navigation Flow)

```
┌─────────────────────────────────────────────────────────────┐
│                        หน้าหลัก (Dashboard)                  │
│  URL: /dashboard                                            │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ ยอดขายวันนี้  │  │ สินค้าทั้งหมด │  │ สต็อกต่ำ (12) │     │
│  │   ฿15,420    │  │     248      │  │  คลิกดูได้!   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                           ↓                 │
│                                    ไปหน้า Inventory         │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│                   หน้าจัดการสินค้า (Products)                │
│  URL: /products/list                                        │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ รหัส │ ชื่อ │ สต็อก │ สถานะ │ จัดการ              │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ P001 │ กาแฟ │  50   │ ปกติ  │ [แก้ไข] [ปรับสต็อก] │    │
│  │ RM01 │ นม   │   5   │ ต่ำ!  │ [แก้ไข] [ปรับสต็อก] │    │
│  └────────────────────────────────────────────────────┘    │
│                                    ↓                        │
│                          คลิก "ปรับสต็อก"                   │
│                                    ↓                        │
│                    เปิด Stock Adjustment Modal              │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│              หน้าจัดการสต็อก (Inventory) - ใหม่             │
│  URL: /inventory                                            │
│                                                             │
│  [ค้นหา...] [กรองตามประเภท▼] [สถานะสต็อก▼]                │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ รหัส │ ชื่อ │ สต็อก │ ขั้นต่ำ │ สถานะ │ จัดการ    │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ P001 │ กาแฟ │  50   │   20   │ ปกติ  │ [ปรับสต็อก] │    │
│  │ RM01 │ นม   │   5   │   10   │ ⚠️ต่ำ │ [ปรับสต็อก] │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│                  🔔 การแจ้งเตือนสต็อกต่ำ                     │
│  (แสดงอัตโนมัติทุกหน้า - มุมล่างขวา)                        │
│                                                             │
│  ┌──────────────────────────────────────┐                  │
│  │ ⚠️ แจ้งเตือนสต็อกต่ำ          [X]    │                  │
│  │ มีสินค้า 12 รายการที่ต้องเติม        │                  │
│  │                                      │                  │
│  │ • นม - เหลือ 5 หน่วย (50%)          │                  │
│  │ • น้ำตาล - เหลือ 2 กก. (20%)        │                  │
│  │ • กาแฟ - เหลือ 15 ถุง (75%)         │                  │
│  │                                      │                  │
│  │ [ดูรายการสต็อกทั้งหมด]              │                  │
│  └──────────────────────────────────────┘                  │
│                    ↓                                        │
│            คลิกไปหน้า /inventory                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📍 จุดเข้าถึงทั้งหมด (Access Points)

### 1️⃣ **จาก Dashboard** (หน้าหลัก)

**URL:** `/dashboard`

**วิธีเข้าถึง:**
- คลิกที่ **Stat Card "สต็อกต่ำ"** → ไปหน้า Inventory
- คลิก **Quick Action "จัดการสต็อก"** → ไปหน้า Inventory

**ไฟล์ที่เกี่ยวข้อง:**
- `src/app/[locale]/dashboard/page.tsx`
- `src/components/pages/dashboard/index.tsx`

**ตัวอย่างโค้ด:**
```tsx
// เพิ่มใน dashboard/index.tsx
<div 
  onClick={() => router.push(`/${locale}/inventory`)}
  className="cursor-pointer hover:shadow-xl transition-shadow"
>
  <h3>สต็อกต่ำ</h3>
  <p className="text-2xl font-bold">{lowStockCount}</p>
</div>
```

---

### 2️⃣ **จาก Navbar** (เมนูบน)

**ตำแหน่ง:** ทุกหน้า (ด้านบน)

**วิธีเข้าถึง:**
- คลิกเมนู **"สินค้า"** → Dropdown → **"จัดการสต็อก"**
- หรือ คลิก **Badge แจ้งเตือน** (ถ้ามีสต็อกต่ำ) → ไปหน้า Inventory

**ไฟล์:** `src/components/navbar.tsx`

**ตัวอย่างโค้ด:**
```tsx
// เพิ่มใน navbar.tsx
<nav>
  <Link href={`/${locale}/products/list`}>สินค้า</Link>
  <Link href={`/${locale}/inventory`}>
    จัดการสต็อก
    {lowStockCount > 0 && (
      <span className="badge bg-red-500">{lowStockCount}</span>
    )}
  </Link>
</nav>
```

---

### 3️⃣ **จากหน้า Product List** (รายการสินค้า)

**URL:** `/products/list`

**วิธีเข้าถึง:**
- คลิกปุ่ม **"ปรับสต็อก"** ในแต่ละแถวสินค้า → เปิด Modal

**ไฟล์:** `src/components/pages/products/list/index.tsx`

**ตัวอย่างโค้ด:**
```tsx
// เพิ่มใน products/list/index.tsx
import { StockAdjustmentModal } from "@/components/ui/stock-adjustment-modal";

function ProductList() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  return (
    <>
      <table>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.code}</td>
              <td>{product.name_i18n.th}</td>
              <td>{product.current_stock}</td>
              <td>
                <Button onClick={() => {
                  setSelectedProduct({
                    id: product.id,
                    name: product.name_i18n.th,
                    code: product.code,
                    current_stock: Number(product.current_stock),
                    unit: product.base_unit.abbreviation_i18n.th,
                  });
                  setIsStockModalOpen(true);
                }}>
                  ปรับสต็อก
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedProduct && (
        <StockAdjustmentModal
          isOpen={isStockModalOpen}
          onClose={() => setIsStockModalOpen(false)}
          product={selectedProduct}
          onSuccess={() => refetchProducts()}
        />
      )}
    </>
  );
}
```

---

### 4️⃣ **จากหน้า Inventory** (จัดการสต็อก - ต้องสร้างใหม่)

**URL:** `/inventory`

**วิธีเข้าถึง:**
- เข้าจาก Dashboard, Navbar, หรือ Low Stock Alert
- คลิกปุ่ม **"ปรับสต็อก"** ในแต่ละแถว → เปิด Modal

**ไฟล์ที่ต้องสร้าง:**
- `src/app/[locale]/inventory/page.tsx`
- `src/components/pages/inventory/index.tsx`
- `src/components/pages/inventory/helper.tsx`

**ตัวอย่างโค้ดหน้า Inventory:**
```tsx
// src/app/[locale]/inventory/page.tsx
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import InventoryContent from "@/components/pages/inventory";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("inventory");
  return {
    title: t("title"),
  };
}

export default function InventoryPage() {
  return <InventoryContent />;
}
```

```tsx
// src/components/pages/inventory/index.tsx
"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { StockAdjustmentModal } from "@/components/ui/stock-adjustment-modal";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle } from "lucide-react";

export default function InventoryContent() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  const handleAdjustStock = (product) => {
    setSelectedProduct({
      id: product.id,
      name: product.name_i18n.th,
      code: product.code,
      current_stock: Number(product.current_stock),
      unit: product.base_unit.abbreviation_i18n.th,
    });
    setIsStockModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">จัดการสต็อกสินค้า</h1>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          {/* เพิ่ม filters ตามต้องการ */}
        </div>

        {/* Product Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th>รหัส</th>
                <th>ชื่อสินค้า</th>
                <th>สต็อกปัจจุบัน</th>
                <th>ขั้นต่ำ</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const isLowStock = Number(product.current_stock) <= Number(product.low_stock_threshold);
                
                return (
                  <tr 
                    key={product.id}
                    className={isLowStock ? "bg-orange-50 border-l-4 border-orange-500" : ""}
                  >
                    <td>{product.code}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        {product.name_i18n.th}
                      </div>
                    </td>
                    <td className="font-semibold">
                      {Number(product.current_stock)} {product.base_unit.abbreviation_i18n.th}
                    </td>
                    <td>{Number(product.low_stock_threshold)}</td>
                    <td>
                      {isLowStock && (
                        <span className="flex items-center gap-1 text-orange-600">
                          <AlertTriangle className="w-4 h-4" />
                          สต็อกต่ำ
                        </span>
                      )}
                    </td>
                    <td>
                      <Button onClick={() => handleAdjustStock(product)}>
                        ปรับสต็อก
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Pagination {...paginationProps} />
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {selectedProduct && (
        <StockAdjustmentModal
          isOpen={isStockModalOpen}
          onClose={() => setIsStockModalOpen(false)}
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

### 5️⃣ **จาก Low Stock Alert** (Popup แจ้งเตือน)

**ตำแหน่ง:** มุมล่างขวา (ทุกหน้า)

**วิธีเข้าถึง:**
- Popup แสดงอัตโนมัติเมื่อมีสต็อกต่ำ
- คลิกปุ่ม **"ดูรายการสต็อกทั้งหมด"** → ไปหน้า Inventory

**ไฟล์:** `src/components/ui/low-stock-alert.tsx` (สร้างแล้ว)

**วิธีเปิดใช้งาน:**
```tsx
// src/app/[locale]/layout.tsx
import { LowStockAlert } from "@/components/ui/low-stock-alert";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <LowStockAlert /> {/* เพิ่มบรรทัดนี้ */}
      </body>
    </html>
  );
}
```

---

### 6️⃣ **จากหน้า POS** (ขายสินค้า)

**URL:** `/pos`

**วิธีเข้าถึง:**
- แสดงเตือนเมื่อเลือกสินค้าที่สต็อกต่ำ
- คลิก **"ดูสต็อก"** → ไปหน้า Inventory

**ไฟล์:** `src/components/pages/pos/index.tsx`

**ตัวอย่างโค้ด:**
```tsx
// เพิ่มใน POS
{product.current_stock <= product.low_stock_threshold && (
  <div className="bg-orange-50 border border-orange-200 rounded p-2 mt-2">
    <div className="flex items-center gap-2 text-orange-700">
      <AlertTriangle className="w-4 h-4" />
      <span className="text-sm">สต็อกเหลือน้อย ({product.current_stock} {product.unit})</span>
    </div>
  </div>
)}
```

---

## 🎯 สรุปการเข้าถึง

| จุดเข้าถึง | URL | Component | สถานะ |
|-----------|-----|-----------|-------|
| Dashboard | `/dashboard` | Stat Card + Quick Action | ✅ มีอยู่แล้ว |
| Navbar | ทุกหน้า | Menu Link + Badge | 📋 ต้องเพิ่ม |
| Product List | `/products/list` | ปุ่ม "ปรับสต็อก" | 📋 ต้องเพิ่ม |
| Inventory | `/inventory` | หน้าจัดการสต็อก | 📋 ต้องสร้างใหม่ |
| Low Stock Alert | ทุกหน้า (Popup) | Floating Alert | ✅ สร้างแล้ว |
| POS | `/pos` | Warning Badge | 📋 ต้องเพิ่ม |

---

## ✅ Checklist การติดตั้ง

### Phase 1: เปิดใช้งาน Low Stock Alert
```tsx
// src/app/[locale]/layout.tsx
import { LowStockAlert } from "@/components/ui/low-stock-alert";

<body>
  {children}
  <LowStockAlert />
</body>
```

### Phase 2: เพิ่มปุ่มใน Product List
```tsx
// src/components/pages/products/list/index.tsx
import { StockAdjustmentModal } from "@/components/ui/stock-adjustment-modal";

// เพิ่มปุ่ม "ปรับสต็อก" ในตาราง
```

### Phase 3: สร้างหน้า Inventory
```bash
# สร้างไฟล์ใหม่
src/app/[locale]/inventory/page.tsx
src/components/pages/inventory/index.tsx
src/components/pages/inventory/helper.tsx
```

### Phase 4: เพิ่ม Link ใน Navbar
```tsx
// src/components/navbar.tsx
<Link href="/inventory">จัดการสต็อก</Link>
```

---

**ทุกอย่างพร้อมใช้งาน! เหลือแค่ integrate ตามขั้นตอนข้างบน** 🚀
