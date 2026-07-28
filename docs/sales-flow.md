# Flow การขายสินค้า (POS Checkout) — เริ่มจากต้นจนจบ

ตรวจสอบจากโค้ดจริง (ไม่ใช่จากความจำ) เมื่อ 2026-07-28 หลังจากแก้ race condition
ของ stock deduction และ sale_number ครอบคลุมเฉพาะ **flow การขายที่หน้า POS** —
ถ้าต้องการ flow อื่น (สร้างสินค้า, ปรับสต็อกจากหน้า inventory, โอนสินค้าระหว่างสาขา)
แจ้งเพิ่มได้ จะเขียนแยกไฟล์

ไฟล์หลักที่เกี่ยวข้อง:
- Frontend: `src/components/pages/pos/{index,helper,product-card,checkout-modal,topping-modal}.tsx`
- Backend: `src/app/api/sales/route.ts`, `src/app/api/products/route.ts`,
  `src/app/api/promotions/validate/route.ts`, `src/lib/permissions.ts`

---

## 1. โหลดหน้า POS

1. `usePOSManager()` (`pos/helper.tsx`) ดึงข้อมูลตั้งต้นพร้อมกัน 3 อย่าง:
   product types, categories, และ **คลัง (warehouse) ที่ user คนนี้ถูก assign
   ไว้เท่านั้น** (`GET /api/warehouses` แล้ว filter ด้วย
   `session.user.warehouse_ids` ฝั่ง client — มาจาก JWT ตอน login)
2. เลือกคลังตั้งต้นอัตโนมัติ: ใช้คลังที่ตั้งเป็น default ถ้ามี ไม่มีก็ใช้ตัวแรก
   ตามรหัสคลัง (sort by code)
3. ถ้า user ไม่ถูก assign คลังไหนเลย → หน้า POS โชว์ข้อความ "ไม่มีคลังที่ได้รับสิทธิ์"
   ไม่มี dropdown ให้เลือก เพราะ `INPUT_TYPES.SELECT` ใช้ `hideEmptyOption` — ไม่มีค่า
   ว่างให้เลือกได้ (แก้ไปช่วงต้นเซสชันนี้ ป้องกันการขายแบบไม่มีคลัง)
4. เมื่อรู้ warehouseId แล้ว → `GET /api/products?warehouseId=...&isActive=true&type=SEMI_FINISHED,FINISHED_GOOD`
   ดึงสินค้าที่ "assign" ไว้กับคลังนี้แล้ว (มี `ProductStock` row ที่ `is_active=true`
   ที่คลังนั้น — ไม่ใช่แค่มี product แล้วโชว์ทุกที่)

### การคำนวณ "เหลือ N" (available_quantity) — ฝั่ง server (`products/route.ts`)

- **FINISHED_GOOD** (สินค้าสำเร็จรูป): ใช้ `current_stock` ของตัวเองตรงๆ ที่คลังนั้น
- **SEMI_FINISHED** (กึ่งสำเร็จรูป เช่น คาปูชิโน่): หาสูตร (recipe) ที่ `is_default
  && is_active`, แล้วสำหรับวัตถุดิบทุกตัวในสูตร คำนวณ
  `floor(สต็อกวัตถุดิบ / จำนวนที่ต้องใช้ต่อแก้ว)` แล้ว**เอาค่าต่ำสุด**
  → นี่คือเลขที่โชว์เป็น "เหลือ N" บนการ์ดสินค้า

  ✅ **แก้แล้ว**: เดิมคำนวณจากวัตถุดิบ**ทุกตัว**ในสูตรโดยไม่เช็ค `track_stock`
  ทำให้ตัวเลขที่โชว์ดูเหมือนเป็นเพดานบังคับ ทั้งที่ตอนตัดสต็อกจริงตอน checkout
  (ดูส่วนที่ 4) ไม่บังคับเช็ควัตถุดิบที่ `track_stock=false` เลย — ตอนนี้แก้ให้
  คำนวณจากวัตถุดิบที่ `track_stock=true` เท่านั้น ตรงกับที่ระบบบังคับจริง
  (ถ้าไม่มีวัตถุดิบที่ track_stock เลยสักตัว = ไม่มีเพดานจริง แสดงเป็นเลขจำนวนมาก
  แทน "ไม่จำกัด")

## 2. สร้างตะกร้า (cart)

- สินค้า **FINISHED_GOOD**: กดปุ่ม "เพิ่มลงตะกร้า" → เข้าตะกร้าเป็น 1 line ทันที
  (ไม่มี topping)
- สินค้า **SEMI_FINISHED**: กดปุ่มแล้วเปิด `ToppingModal` ก่อน — ดึง topping ที่
  เปิดใช้กับสินค้านี้จริง (`GET /api/toppings?product_id=...`) ให้เลือก 0 ตัวขึ้นไป
  แล้วค่อยยืนยันเข้าตะกร้า
- แต่ละ cart line มี `lineId = productId + topping ids ที่เรียงแล้ว` — เลือก
  topping ต่างกันสำหรับสินค้าเดียวกัน จะได้ line แยกกัน (ไม่ merge ปนกัน)
- **สลับคลัง (warehouse) ทั้งที่ตะกร้ายังมีของ → ตะกร้าจะถูกล้างทันที** พร้อม toast
  แจ้งเตือน (กันไม่ให้ 1 การขายมีสินค้าจากคนละคลังปนกัน — แก้ไปช่วงต้นเซสชันนี้)

## 3. เปิด modal ชำระเงิน (`CheckoutModal`)

1. (ไม่บังคับ) กรอกโค้ดโปรโมชั่น → `POST /api/promotions/validate` เช็ค
   active / ยังไม่หมดอายุ / ยังไม่ครบจำนวนครั้งใช้สูงสุด แล้วคำนวณส่วนลด
   **preview** ให้ดู — ขั้นนี้ยังไม่ได้ตัด `used_count` จริง
2. เลือกวิธีจ่าย (เงินสด/บัตร) — เงินสดจะช่วย auto-fill ยอดพอดี และคำนวณเงินทอน
3. กด "ยืนยันการชำระเงิน" → เรียก `checkout()` ใน `pos/helper.tsx` →
   `POST /api/sales` พร้อม `{ warehouse_id, items: [{product_id, quantity,
   unit_price, toppings}], payment_method, promotion_code }`

   ✅ **แก้แล้ว**: เดิม server ใช้ `item.unit_price || product.selling_price`
   คือเชื่อราคาที่ client ส่งมาก่อน (แก้ราคาได้จาก devtools/เรียก API ตรงๆ) —
   ตอนนี้เปลี่ยนเป็นใช้ `product.selling_price` จาก DB เสมอ ไม่สนใจ
   `item.unit_price` ที่ client ส่งมาแล้ว เช่นเดียวกับ `discount_percent`/
   `discount_amount` ต่อรายการ และ `discount_amount` ระดับทั้งบิล — เดิมรับค่า
   จาก client ตรงๆไปหักราคาจริงเลยโดยไม่มีการตรวจสอบ (ไม่มี manual-discount
   feature ในระบบ ส่วนลดที่แท้จริงมีทางเดียวคือโค้ดโปรโมชั่นที่ validate ฝั่ง
   server เท่านั้น) ตอนนี้ทั้งสองจุดถูก ignore ค่าจาก client แล้ว บังคับเป็น 0
   เสมอ เหลือแต่ `promotionDiscount` ที่คำนวณจากโปรโมชั่นที่ validate แล้วจริงๆ

## 4. `POST /api/sales` — ฝั่ง backend (จุดสำคัญที่สุด)

1. เช็คสิทธิ์ `sales.create` และเช็คสิทธิ์เข้าคลังนี้แบบ **live query DB**
   (`assertWarehouseAccessLive` — ไม่ใช่แค่เช็คจาก JWT เพราะถ้า user ถูกถอนสิทธิ์
   คลังไปแล้วเมื่อกี้ ต้อง block ทันที ไม่ต้องรอ JWT หมดอายุ/login ใหม่)
2. Loop สินค้าทุกตัวในตะกร้า: ดึงสินค้าจริงจาก DB, คำนวณราคา/ส่วนลด,
   ถ้ามี topping ต้องเช็คว่าสินค้านี้เป็น SEMI_FINISHED และ topping นี้เปิดใช้กับ
   สินค้านี้จริง (ผ่าน `ProductTopping`) ไม่งั้น reject
3. เช็คโปรโมชั่นซ้ำอีกรอบ (นอก transaction) แล้ว**สร้างเลขที่ขาย (sale_number)**
   แบบ `SAL-YYYYMMDD-NNNN` — **จุดที่เพิ่งแก้วันนี้**: ถ้าเลขชนกัน (2 คน checkout
   พร้อมกันพอดี) จะ retry คำนวณเลขใหม่อัตโนมัติ (สูงสุด 5 ครั้ง) ไม่ใช่ error 500
   เหมือนก่อนแก้
4. เปิด `$transaction` เดียว ครอบทุกอย่างข้างล่างนี้ — **พังตรงไหนก็ rollback
   ทั้งหมด** ไม่มีการเขียนครึ่งๆกลางๆ:
   - เช็ค + ตัดโปรโมชั่นแบบ atomic (`used_count: {increment: 1}` ใน tx เพื่อกัน
     คนใช้โค้ดพร้อมกันเกิน max_uses)
   - สร้าง `Sale` + `SaleItem` (+ `SaleItemTopping`)
   - ตัดสต็อกแต่ละรายการ (`deductStock`) — แยกตามประเภทสินค้า:
     - **FINISHED_GOOD/INGREDIENT**: ตัด `current_stock` ของตัวเองตรงๆ
     - **SEMI_FINISHED**: หาสูตร default แล้วตัดสต็อก**วัตถุดิบทุกตัว**ตามสูตร
       (เช็คว่าวัตถุดิบพอ**ก่อน**ตัดของทุกตัว กันตัดไปครึ่งทางแล้วพอดีขาดตัวหลัง)
   - ตัดสต็อก topping ที่เลือกด้วย (ใช้วัตถุดิบเดียวกับ recipe ingredient)
   - **การตัดสต็อกทุกจุดเป็น atomic UPDATE...WHERE current_stock >= จำนวน**
     (Prisma `updateMany`) ไม่ใช่ read-then-write แบบเดิม — กัน 2 การขายพร้อมกัน
     อ่านสต็อกพอ (stale) แล้วขายเกินสต็อกจริงทั้งคู่ (แก้วันนี้เช่นกัน)
   - ถ้าวัตถุดิบไหน `track_stock=false` → ไม่บังคับเช็คพอ/ไม่พอ ปล่อยให้ตัดติดลบได้
     (ของเดิมตั้งใจให้ไม่ track stock = ไม่จำกัด)
   - ทุกจุดที่ตัดสต็อกจะสร้าง `StockMovement` (audit trail) ผูกกับ `reference_id`
     ของ sale นี้
5. ถ้าทุกอย่างผ่าน → commit, ดึง sale แบบเต็ม (พร้อม relations) กลับไปให้ frontend

## 5. หลัง checkout สำเร็จ

- Frontend: toast แจ้งเลขที่ขาย, ล้างตะกร้า, `fetchProducts()` ใหม่ (เพื่อให้
  "เหลือ N" อัปเดตตามสต็อกล่าสุดทันที ไม่ต้อง refresh หน้า)
- รายการขายไปโชว์ที่หน้า "รายการขาย" (`/sales`) — ค้นหาได้ด้วยเลขที่ขาย,
  filter ตามช่วงวันที่ (datepicker locale-aware, แก้ไปช่วงต้นเซสชันนี้), มีปุ่ม
  "ยกเลิกการขาย" (void) สำหรับ user ที่มีสิทธิ์ `sales.void`
- สต็อกที่ถูกตัดไปโชว์ที่หน้า "จัดการสต็อก" (`/inventory`) ทันที (อ่านจาก
  `ProductStock.current_stock` ตัวเดียวกันที่ transaction ข้างบนอัปเดต)

---

## สรุปจุดป้องกัน race condition ที่มีอยู่ตอนนี้

| จุด | วิธีป้องกัน |
|---|---|
| ตัดสต็อกสินค้า/วัตถุดิบ (checkout) | atomic `UPDATE...WHERE current_stock >= n` |
| ตัดสต็อก (ปรับสต็อกมือจากหน้า inventory) | atomic เช่นกัน (`inventory/adjust/route.ts`) |
| เลขที่ขาย (sale_number) | retry เมื่อชน unique constraint |
| ใช้โค้ดโปรโมชั่นเกิน max_uses | re-check + increment ใน transaction เดียวกัน |
| สิทธิ์เข้าคลัง (ตอน checkout) | live query DB ไม่ใช่แค่ JWT claim |

ทั้ง 3 จุดแรกแก้/ยืนยันแล้วในเซสชันนี้ (ทดสอบจริงด้วยการยิง concurrent request
ผ่าน `Promise.all`) ส่วน 2 จุดหลังมีอยู่แล้วในโค้ดเดิม อ่านตรวจสอบแล้วว่าถูกต้อง

## สรุปช่องโหว่เรื่องราคาที่พบและแก้ในรอบนี้

| จุด | ก่อนแก้ | หลังแก้ |
|---|---|---|
| ราคาต่อหน่วย (`unit_price`) | เชื่อค่าที่ client ส่งมาก่อน | ใช้ `product.selling_price` จาก DB เสมอ |
| ส่วนลดต่อรายการ | เชื่อ `item.discount_amount`/`discount_percent` จาก client | บังคับเป็น 0 เสมอ (ไม่มี manual-discount feature จริง) |
| ส่วนลดทั้งบิล | เชื่อ `discount_amount` จาก client (บวกกับส่วนลดโปรโมชั่น) | เหลือแต่ส่วนลดจากโปรโมชั่นที่ validate แล้วเท่านั้น |
| เพดาน "เหลือ N" ของสินค้ากึ่งสำเร็จรูป | คิดจากวัตถุดิบทุกตัว (รวมตัวที่ไม่ track stock) | คิดจากวัตถุดิบที่ `track_stock=true` เท่านั้น ตรงกับที่ระบบบังคับจริง |

ทดสอบยืนยันด้วยการยิง API ตรง (ข้าม UI) ส่ง `unit_price`/`discount_amount`
ปลอมๆไปแล้ว ยืนยันว่า server เมิน ค่าที่ใช้จริงคือราคา/ส่วนลดจาก DB เท่านั้น
และทดสอบว่าโค้ดโปรโมชั่นจริง (SUMMER1) ยังหักส่วนลดถูกต้องตามปกติ ไม่ได้รับผลกระทบ
