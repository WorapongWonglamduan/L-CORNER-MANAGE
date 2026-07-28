# งานที่เหลือ: ชำระด้วย QR PromptPay + จอแสดงผลลูกค้า

Branch นี้ (`feature/qr-payment-customer-display`) มีแค่ groundwork เสร็จ ยังใช้งานจริงไม่ได้
เขียนไว้ให้ต่อได้จากศูนย์แม้เปิดเซสชันใหม่ ไม่มี context เดิม

## เสร็จแล้ว
- Schema: `Warehouse.promptpay_id String?` + `db push` แล้ว
- `src/app/api/warehouses/route.ts` (POST) และ `[id]/route.ts` (PUT) persist `promptpay_id` แล้ว
- Settings > สาขา มีช่องกรอกเลขพร้อมเพย์แล้ว (`form/config.ts`, `helper.tsx`) พร้อม validate format (เบอร์โทร 10 หลัก/เลขผู้เสียภาษี 13 หลัก)
- ติดตั้ง `promptpay-qr` (generate payload) + `react-qr-code` (render QR) แล้ว — อยู่ใน `package.json`
- `PAYMENT_METHODS.QR = "qr"` เพิ่มแล้วใน `src/constants/payment.ts`
- `pos/helper.tsx`'s `Warehouse` interface มี `promptpay_id: string | null` แล้ว (แต่ยังไม่ได้ใช้จริงที่ไหน)

## ยังไม่ทำเลย — ส่วนที่ 1: ปุ่มชำระ QR ที่หน้า POS

1. **`src/components/pages/pos/index.tsx`** — หา warehouse ปัจจุบันจาก `warehouse.warehouses.find(w => w.id === warehouse.warehouseId)`, ส่ง `promptpayId={currentWarehouse?.promptpay_id}` เป็น prop ใหม่ให้ `<CheckoutModal>`
2. **`src/components/pages/pos/checkout-modal.tsx`** — เพิ่ม prop `promptpayId?: string | null`, เพิ่มปุ่มวิธีชำระที่ 3 "QR พร้อมเพย์" (ไอคอน `QrCode` จาก `lucide-react`) คู่กับเงินสด/บัตรที่มีอยู่แล้ว:
   - ถ้า `promptpayId` ไม่มีค่า → disable ปุ่มนี้ + โชว์ข้อความว่ายังไม่ตั้งค่าเลขพร้อมเพย์สำหรับสาขานี้ (ไปตั้งที่ Settings > สาขา)
   - ถ้าเลือกแล้วมีค่า → import `generatePayload from "promptpay-qr"` (default export, `export =` module — ใช้ `import generatePayload from "promptpay-qr"` ได้ตรงๆ เพราะ `esModuleInterop: true` อยู่แล้ว), เรียก `generatePayload(promptpayId, { amount: discountedTotal })` ได้ payload string, render ด้วย `import QRCode from "react-qr-code"` → `<QRCode value={payload} />`
   - ไม่ต้องมีช่อง "รับเงิน"/คำนวณเงินทอนแบบเงินสด (ยอด QR ต้อง exact) — มีแค่ QR + ยอดที่ต้องโอน + ปุ่ม "ยืนยันการชำระเงินแล้ว" (เรียก `onConfirm("qr", promotionCode)` เหมือนที่มีอยู่แล้วสำหรับ cash/card)
3. **i18n** — เพิ่ม key ใหม่ใน `i18n/messages/th.json`/`en.json`:
   - namespace `pos`: label ปุ่ม QR, ข้อความ "ยังไม่ตั้งค่าเลขพร้อมเพย์สำหรับสาขานี้", คำอธิบายให้สแกน
   - namespace `sales`: เพิ่ม key `"qr"` คู่กับ `"cash"`/`"card"` ที่มีอยู่แล้ว (ใช้ตอนแสดงชื่อวิธีชำระในหน้ารายการขาย ผ่าน `getPaymentMethodLabel` ใน `sales/index.tsx` ซึ่งเรียก `t(method.toLowerCase())`)

## ยังไม่ทำเลย — ส่วนที่ 2: จอแสดงผลลูกค้า (SSE) — ยังไม่เริ่มแม้แต่ไฟล์เดียว

1. **`src/lib/pos-display-bus.ts`** (ไฟล์ใหม่) — in-memory pub/sub ด้วย Node `EventEmitter`, key ด้วย `warehouseId`:
   ```ts
   export function publishCart(warehouseId: string, snapshot: unknown): void
   export function subscribe(warehouseId: string, cb: (snapshot: unknown) => void): () => void // returns unsubscribe
   ```
   หมายเหตุ: ใช้ได้เพราะแอปรันเป็น Node process เดียว ถ้าอนาคต scale เป็นหลาย instance ต้องเปลี่ยนไปใช้ shared broker (Redis pub/sub)

2. **`src/app/api/pos/display/route.ts`** (ไฟล์ใหม่) — ต้องมี `export const dynamic = "force-dynamic"` กัน Next cache:
   - `GET` — `?warehouseId=`, เช็ค auth (session + `requireWarehouseAccess` จาก `src/lib/permissions.ts`), เปิด `ReadableStream` ส่ง SSE (`Content-Type: text/event-stream`), subscribe เข้า bus, ส่ง snapshot ล่าสุดทันทีที่ connect (กันจอว่างตอนเพิ่งเปิด), ส่ง heartbeat comment ทุก ~25s กัน connection ถูกตัดผ่าน proxy, unsubscribe ตอน stream cancel
   - `POST` — body `{ warehouse_id, items, total, itemCount }`, เช็ค `requirePermission(session, "sales.create")` + `assertWarehouseAccessLive` → เรียก `publishCart`

3. **`src/components/pages/pos/helper.tsx`** — เพิ่ม `useEffect` debounce (~300ms, inline ด้วย `useRef`+`setTimeout`) ที่ยิง `POST /api/pos/display` ทุกครั้งที่ `cart`/`warehouseId` เปลี่ยน ส่ง cart snapshot ปัจจุบัน (`cart`, `cartTotal`, `cartItemCount`) — cart ที่ล้างหลัง checkout สำเร็จจะ push สถานะว่างไปเองตาม effect เดิม ไม่ต้องเขียนกรณีพิเศษ

4. **`src/app/[locale]/pos/display/page.tsx`** (ไฟล์ใหม่) → render `<POSDisplayContent />`

5. **`src/components/pages/pos-display/index.tsx`** (ไฟล์ใหม่) — เต็มจอ ไม่มี sidebar/nav, ฟอนต์ใหญ่:
   - อ่าน `warehouseId` จาก query string (`?warehouseId=`)
   - เปิด `new EventSource('/api/pos/display?warehouseId=...')`, แสดงรายการสินค้า+จำนวน+ราคา+ยอดรวม, หน้า idle/ขอบคุณเวลาไม่มีออเดอร์ (cart ว่าง)
   - ถ้าไม่มี `warehouseId` ใน query → โชว์ตัวเลือกสาขา (ดึงจาก `/api/warehouses` + filter ตาม `session.user.warehouse_ids` เหมือน `usePOSManager`) ให้เลือกครั้งแรกตอน setup จอ
   - ใช้งานจริง: เปิด URL นี้บนจอที่สอง (เครื่องเดียวกับ POS) หรือบนแท็บเล็ตแยกเครื่องก็ได้ — โค้ดเดียวกันทั้ง 2 เคส

## หลังทำเสร็จทั้งหมด — Verification

- `npx tsc --noEmit` / eslint ทุกไฟล์ที่แก้/สร้างใหม่
- ทดสอบจริงบน dev server (port 3077):
  - ตั้งเลขพร้อมเพย์ที่ Settings > สาขา → บันทึก → เปิดใหม่เห็นค่าเดิม
  - หน้า POS: เลือกวิธีชำระ QR → เห็น QR code จริง + ยอดเงินตรงกับตะกร้า → กดยืนยัน → สร้าง sale สำเร็จ, `payment_method` เป็น `"qr"`
  - เอาเลขพร้อมเพย์ของสาขาออก → ปุ่ม QR ต้อง disable พร้อมข้อความ
  - เปิด `/pos/display?warehouseId=...` อีกแท็บ/หน้าต่างขณะเปิด POS คนละแท็บ → เพิ่ม/ลบ/แก้จำนวนสินค้าในตะกร้าฝั่ง POS แล้วเห็นอัปเดตฝั่งจอแสดงผลแบบ real-time, checkout สำเร็จแล้วจอแสดงผลเคลียร์กลับไปหน้า idle
  - รีเฟรชหน้าจอแสดงผล → ต้องเห็น snapshot ล่าสุดทันที ไม่ใช่จอเปล่ารอ event ถัดไป

## เรื่องที่คุยกันไว้แล้ว (ไม่ต้องถามซ้ำ)
- QR ระดับนี้คือ "แสดง QR + แคชเชียร์ยืนยันเองด้วยตา" ไม่มี auto-confirm — auto-confirm ต้องสมัคร payment gateway จริง (2C2P/Omise/API ธนาคาร) ไม่มีตัวเลือกฟรีแท้ๆ ส่วนใหญ่คิดค่าธรรมเนียมต่อรายการ เป็น phase ถัดไปที่ต้องให้เจ้าของร้านไปสมัครเองก่อน
- จอแสดงผลลูกค้าต้องรองรับทั้งจอที่สอง (เครื่องเดียวกัน) และแท็บเล็ตแยกเครื่อง → เลือกใช้ SSE เพราะครอบคลุมทั้ง 2 เคสด้วยโค้ดเดียว
- เลขพร้อมเพย์ตั้งค่าแยกตามสาขา ไม่ใช่ค่าเดียวทั้งระบบ
