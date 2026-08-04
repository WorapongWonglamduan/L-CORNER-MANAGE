# Setup โปรเจกต์บนเครื่องใหม่

## ก่อนย้ายเครื่อง (ทำที่เครื่องเดิม)

1. Push branch ที่ทำงานอยู่ให้ครบ (`main` และ/หรือ `feature/qr-payment-customer-display`)
2. **สำรอง `.env` เอง แยกจาก git** — ไฟล์นี้อยู่ใน `.gitignore` (`.env*`) จะไม่ติดไปกับ `git clone`/`git pull` เด็ดขาด ต้อง copy ไปเองผ่านช่องทางอื่น (USB/ส่งให้ตัวเอง) เพราะมีทั้งค่าเชื่อมต่อ DB, `NEXTAUTH_SECRET`, และ `API_KEY_21ST` อยู่ในนั้น

## บนเครื่องใหม่

1. `git clone` โปรเจกต์ แล้ว `git checkout <branch ที่จะทำต่อ>`
2. วางไฟล์ `.env` ที่สำรองมาไว้ที่ root ของโปรเจกต์
3. เปิด Postgres ในเครื่อง — **เช็ค port ให้ตรงกันก่อน**: `docker-compose.yml` map port `5436:5432` แต่ `.env` เขียน `DB_PORT=5435` (ไม่ตรงกัน) แก้ให้ตรงกันอย่างใดอย่างหนึ่งก่อน (แก้ `docker-compose.yml` เป็น `5435:5432` ให้ตรงกับ `.env` ง่ายสุด) แล้ว `docker compose up -d`
4. `npm install`
5. `npx prisma generate` — จำเป็นถ้า schema เปลี่ยนไปจากเดิม (เช่น branch `feature/qr-payment-customer-display` มี `promptpay_id` เพิ่ม)
6. `npx prisma migrate deploy` — สร้างตารางตาม migration history ใน `prisma/migrations/` (มี history จริงแล้ว ไม่ต้องใช้ `db push` อีกต่อไป)
7. `npm run db:seed` — ล้างข้อมูลเก่าทั้งหมดแล้วสร้างข้อมูลตัวอย่างใหม่ทั้งชุด (users/roles/warehouses/products/recipes/promotions ฯลฯ) ใช้ได้เลยกับ DB เปล่าๆ ไม่ต้องมีข้อมูลเดิมมาก่อน
8. `npm run dev` (รันที่ port 3077)
9. Login ทดสอบด้วย `admin@lcorner.local` / `admin123` (มาจาก `prisma/seed.ts`)

## หมายเหตุ

- รูปสินค้าที่อัปโหลดทดสอบไว้ที่ `public/uploads/` เป็น untracked ไม่ติดไปด้วย (ไม่กระทบการทำงาน แค่ภาพสินค้าจะหายไปเฉยๆ)
- `.claude/settings.local.json` ก็ไม่ติดไปเหมือนกัน (ตั้งค่าเฉพาะเครื่อง ไม่กระทบโค้ด)
