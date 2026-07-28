# ชำระด้วย QR PromptPay + จอแสดงผลลูกค้า

**สถานะ: เสร็จสมบูรณ์แล้ว** (2026-07-29) — Branch นี้ (`feature/qr-payment-customer-display`)
ทั้งโค้ดและการตรวจสอบด้วยตาผ่านเบราว์เซอร์จริง (Playwright MCP) ผ่านหมดแล้ว ครบทุกข้อใน
checklist ด้านล่าง

## เสร็จแล้ว — groundwork
- Schema: `Warehouse.promptpay_id String?` + `db push` แล้ว
- `src/app/api/warehouses/route.ts` (POST) และ `[id]/route.ts` (PUT) persist `promptpay_id` แล้ว
- Settings > สาขา มีช่องกรอกเลขพร้อมเพย์แล้ว พร้อม validate format
- ติดตั้ง `promptpay-qr` + `react-qr-code` แล้ว (รันจริง อยู่ใน `node_modules`)
- `PAYMENT_METHODS.QR = "qr"` ใน `src/constants/payment.ts`

## เสร็จแล้ว — ส่วนที่ 1: ปุ่มชำระ QR ที่หน้า POS
- `src/components/pages/pos/index.tsx` ส่ง `promptpayId={currentWarehouse?.promptpay_id}` ให้ `<CheckoutModal>`
- `src/components/pages/pos/checkout-modal.tsx` มีปุ่มวิธีชำระที่ 3 "QR พร้อมเพย์"
  (grid 3 คอลัมน์) — disable + ข้อความ `qrNotConfigured` ถ้าไม่มี `promptpayId`, ถ้ามีค่า
  generate payload ด้วย `promptpay-qr` แล้ว render ผ่าน `<QRCode>` จาก `react-qr-code`
  พร้อมยอดที่ต้องโอน, ปุ่ม "ยืนยันการชำระเงินแล้ว" เดิมเรียก `onConfirm("qr", ...)` ได้เลย
- i18n keys เพิ่มแล้วทั้ง th/en: `pos.qr`, `pos.qrNotConfigured`, `pos.qrScanInstruction`,
  `sales.qr`

## เสร็จแล้ว — ส่วนที่ 2: จอแสดงผลลูกค้า (SSE)
- `src/lib/pos-display-bus.ts` — in-memory pub/sub ด้วย `EventEmitter`, เก็บ snapshot
  ล่าสุดต่อ `warehouseId` ด้วย (`getLastSnapshot`) ให้จอที่เพิ่ง connect/refresh เห็นสถานะ
  ทันทีไม่ต้องรอ event ถัดไป
- `src/app/api/pos/display/route.ts` — `GET` เปิด SSE stream (`force-dynamic`, heartbeat
  ทุก 25s, ส่ง snapshot ล่าสุดทันทีตอน connect), `POST` publish (auth: `sales.create` +
  `assertWarehouseAccessLive`)
- `src/components/pages/pos/helper.tsx` — debounce 300ms push cart ไป
  `POST /api/pos/display` ทุกครั้งที่ `cart`/`warehouseId` เปลี่ยน
- `src/app/[locale]/pos/display/page.tsx` + `src/components/pages/pos-display/index.tsx`
  — จอเต็มหน้าจอ อ่าน `warehouseId` จาก query, ไม่มีค่า → โชว์ตัวเลือกสาขา (กรองตาม
  `session.user.warehouse_ids`), มีค่า → เปิด `EventSource` ฟัง real-time, มีหน้า idle
  เวลาตะกร้าว่าง
- i18n namespace ใหม่ `posDisplay` (th/en): `selectBranch`, `loading`,
  `noWarehouseAssigned`, `idleTitle`, `idleSubtitle`, `currentOrder`, `items`

## ตรวจสอบแล้ว (ผ่าน curl + session cookie จริง ไม่ใช่เบราว์เซอร์)
- `npx tsc --noEmit` และ `eslint` ทุกไฟล์ที่แก้/สร้างใหม่ — ผ่าน ไม่มี error (มีแต่
  warning เดิมที่ไม่เกี่ยวกับงานนี้)
- Login จริงผ่าน `/api/auth/callback/credentials` (admin@lcorner.local / admin123)
  ได้ session cookie
- ตั้งเลขพร้อมเพย์ผ่าน `PUT /api/warehouses/:id` → บันทึกและอ่านคืนค่าถูกต้อง
- `GET /api/pos/display?warehouseId=...` (SSE): connect แล้วได้ snapshot ล่าสุดทันที,
  publish ผ่าน `POST /api/pos/display` แล้ว event ใหม่มาถึง stream จริง — ยืนยัน
  pub/sub + "เห็น snapshot ล่าสุดทันทีตอน reconnect" ทำงานถูกต้อง
- `POST /api/sales` ด้วย `payment_method: "qr"` → สร้าง sale สำเร็จ (201), บันทึก
  `payment_method: "qr"` ถูกต้อง (สร้างไว้เป็น sale จริงในฐานข้อมูล dev:
  `SAL-20260728-0013` — ลบ/void ทิ้งได้ถ้าไม่ต้องการ)
- `/th/pos` และ `/th/pos/display` โหลดสำเร็จ (HTTP 200) ตอน login แล้ว ไม่มี error
  ฝัง SSR

## ตรวจสอบด้วยตาแล้ว (Playwright MCP, 2026-07-29)
เข้าสู่ระบบจริงด้วย `admin@lcorner.local` / `admin123`, ตั้งเลขพร้อมเพย์ให้ WH001
(`0812345678`) ผ่านหน้า Settings > สาขา แล้วทดสอบผ่านเบราว์เซอร์จริง:
- หน้า POS (WH001): กด "QR พร้อมเพย์" → ปุ่มเปิดใช้งานได้, เห็น QR code จริง render
  บนจอ (ไม่ใช่ placeholder) พร้อมยอด "฿30" ตรงกับตะกร้า, ไม่มีช่อง "รับเงิน"
- เปิด `/th/pos/display?warehouseId=...` อีกแท็บพร้อมกับ POS: เพิ่มสินค้าที่ POS →
  จอแสดงผลอัปเดต real-time ทันที (โดริโทส x1 → เพิ่ม คิดแคท x1 → เห็นทั้ง 2 รายการ
  พร้อมยอดรวมอัปเดตเป็น ฿30 โดยไม่ต้อง refresh)
- กด "ยืนยันการชำระเงิน" ด้วยวิธี QR → sale สร้างสำเร็จ, สต็อกถูกตัดจริง (โดริโทส
  26.0001→25.0001, คิดแคท 6→5), ตะกร้าเคลียร์, จอแสดงผลกลับไปหน้า idle
  ("ยินดีต้อนรับ / รอรายการสั่งซื้อ") อัตโนมัติ
- สลับไป WH002 (ไม่มีเลขพร้อมเพย์) → ตะกร้าถูกล้างพร้อม toast แจ้งเตือน, เปิด
  checkout แล้วปุ่ม "QR พร้อมเพย์" เป็นสีเทา/disable จริง พร้อมข้อความ
  "สาขานี้ยังไม่ได้ตั้งค่าเลขพร้อมเพย์ ไปตั้งค่าได้ที่ ตั้งค่า > สาขา"
- Console ทั้งหน้า POS และหน้าจอแสดงผล ไม่มี error (มี warning เดิม 1 ตัวเรื่อง
  Next.js Image LCP ที่ไม่เกี่ยวกับงานนี้)

**ยังไม่ได้ทำ (นอกขอบเขต):** สแกน QR ด้วยแอปธนาคารจริงเพื่อยืนยัน payload (ต้องมี
เครื่องโทรศัพท์+บัญชีพร้อมเพย์จริง), ทดสอบ layout บนจอ/แท็บเล็ตขนาดจริง (ทดสอบแค่
ขนาด viewport เบราว์เซอร์ desktop)

## เสร็จแล้ว — ส่วนที่ 3: QR + หน้าขอบคุณ ขึ้นจอแสดงผลลูกค้าด้วย (เพิ่มทีหลัง, 2026-07-29)

เดิมจอแสดงผลลูกค้ามีแค่ 2 สถานะ (ว่าง/กำลังสั่ง) — QR โชว์แค่ฝั่งแคชเชียร์ ลูกค้าต้อง
หันจอมาดู เพิ่ม 2 สถานะใหม่ ออกแบบ mockup ก่อนทำจริง (ดูที่มาการตัดสินใจด้านล่าง):

- **`src/components/pages/pos/helper.tsx`** — export type `DisplayPaymentState`
  (`{status:"awaiting_qr", qrPayload, amount} | {status:"success", amount, saleNumber} | null`),
  state `displayPaymentState` + setter คืนออกมาเป็น `display: {paymentState, setPaymentState}`,
  รวมเข้ากับ payload ที่ debounce push ไป `/api/pos/display` (`payment` field), และใน
  `checkout()` หลัง sale สร้างสำเร็จ (**ทุกวิธีชำระ ไม่ใช่แค่ QR** — ตัดสินใจไว้แล้ว ไม่ต้องถามซ้ำ)
  set เป็น `{status:"success", amount, saleNumber}` แล้ว auto-clear กลับเป็น `null` หลัง 5
  วินาที (`DISPLAY_SUCCESS_DURATION_MS`)
- **`src/components/pages/pos/checkout-modal.tsx`** — prop ใหม่ `onDisplayStateChange`,
  sync effect push `awaiting_qr` เข้า display ทันทีที่เลือก QR (ไม่ต้องรอกดยืนยัน) —
  **มี race condition ที่แก้แล้ว 2 จุด ต้องรู้ไว้ถ้าจะแก้โค้ดส่วนนี้ต่อ:**
  1. Effect ที่ sync ต้อง guard ด้วย `isProcessing` ด้วย ไม่ใช่แค่ `isOpen` — เพราะ
     `clearCart()` ข้างใน `checkout()` ทำให้ prop `cartTotal` เหลือ 0 *ระหว่างที่ modal
     ยังเปิดอยู่* (ก่อน `isOpen` จะเปลี่ยนเป็น false ด้วยซ้ำ) ถ้าไม่ guard จะ push
     `awaiting_qr` ยอด ฿0 ทับ `success` ที่เพิ่ง set ไปหมาดๆ
  2. `onOpenChange` ของ Dialog ยิงซ้ำอีกครั้งหลัง `isOpen` เปลี่ยนเป็น false แม้จะปิดจาก
     การ confirm สำเร็จ (ไม่ใช่แค่ user กด cancel/ESC/backdrop) — ถ้า handler เดิม (`handleClose`)
     เคลียร์ display เป็น `null` แบบไม่มีเงื่อนไข จะไปทับ `success` อีกที ใช้
     `justSucceededRef` (set = true ตอน `handleConfirm` สำเร็จ ก่อนเรียก `onClose()`) ให้
     `handleClose` เช็คแล้วข้ามการเคลียร์ในเคสนี้
  - Verified ผ่าน `window.EventSource` + timestamp logging ตรงๆ (ไม่ใช่ screenshot race
    กับ 5 วิ): ลำดับ event สะอาด `awaiting_qr → success → (5000-5025ms) → null` ทั้ง QR และ
    เงินสด ไม่มี state แปลกปลอมคั่นกลางอีกแล้ว
- **`src/components/pages/pos-display/index.tsx`** — render `payment.status==="awaiting_qr"`
  (QR การ์ดขาว + ยอดเงิน + จุดสั่น "รอการยืนยันจากพนักงาน") ก่อน idle/ordering, และ
  `payment.status==="success"` (เครื่องหมายถูกเขียว + ยอดเงิน + เลขที่ออเดอร์) — ทั้งคู่
  ใช้ `react-qr-code`/`lucide-react` เหมือนฝั่ง checkout modal
- **`src/app/api/pos/display/route.ts`** — POST รับ field `payment` เพิ่ม ส่งต่อเข้า bus
  เฉยๆ ไม่ validate shape (relay อย่างเดียว เหมือน `items`/`total` เดิม)
- i18n `posDisplay` เพิ่ม: `paying`, `amountDue`, `scanInstruction`, `waitingConfirm`,
  `successTitle`, `successSubtitle`

**การตัดสินใจที่ถามผู้ใช้แล้ว (ไม่ต้องถามซ้ำ):** หน้า "ชำระเงินสำเร็จ" ใช้กับ**ทุกวิธี
ชำระ** (เงินสด/บัตร/QR) ไม่ใช่แค่ QR — เพื่อความสม่ำเสมอ ไม่ให้ลูกค้าที่จ่ายเงินสดเจอจอ
กระโดดจากมีของในตะกร้าไปเป็นหน้าว่างทันทีแบบไม่มีการปิดลูป

## เรื่องที่คุยกันไว้แล้ว (ไม่ต้องถามซ้ำ)
- QR ระดับนี้คือ "แสดง QR + แคชเชียร์ยืนยันเองด้วยตา" ไม่มี auto-confirm — auto-confirm ต้องสมัคร payment gateway จริง (2C2P/Omise/API ธนาคาร) ไม่มีตัวเลือกฟรีแท้ๆ ส่วนใหญ่คิดค่าธรรมเนียมต่อรายการ เป็น phase ถัดไปที่ต้องให้เจ้าของร้านไปสมัครเองก่อน
- จอแสดงผลลูกค้าต้องรองรับทั้งจอที่สอง (เครื่องเดียวกัน) และแท็บเล็ตแยกเครื่อง → เลือกใช้ SSE เพราะครอบคลุมทั้ง 2 เคสด้วยโค้ดเดียว
- เลขพร้อมเพย์ตั้งค่าแยกตามสาขา ไม่ใช่ค่าเดียวทั้งระบบ
