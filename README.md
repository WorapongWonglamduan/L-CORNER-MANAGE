# L-Corner POS System
## ระบบจุดขายพร้อมจัดการสต็อกสินค้า

> **Tech Stack:** Next.js 16+ · PostgreSQL 16+ · Prisma · TypeScript 5+ · shadcn/ui · next-intl

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Docker Setup](#docker-setup)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Documentation](#documentation)
- [Tech Stack](#tech-stack)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

ก่อนเริ่มต้น ต้องติดตั้งโปรแกรมเหล่านี้ก่อน:

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **npm** 10+ (มาพร้อม Node.js)
- **PostgreSQL** 16+ ([Download](https://www.postgresql.org/download/))
  - หรือใช้ Docker (แนะนำ)
- **Git** ([Download](https://git-scm.com/))

---

## Quick Start

### วิธีที่ 1: Setup แบบเร็ว (Local Development)

```bash
# 1. Clone repository
git clone <repository-url>
cd l-corner-manage

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp env.template .env
# แก้ไข .env ตามต้องการ (ถ้าใช้ค่า default ไม่ต้องแก้)

# 4. Start PostgreSQL (ถ้ายังไม่ได้เปิด)
# หรือใช้ Docker: docker-compose up -d postgres

# 5. Setup database
npm run db:generate
npm run db:push
npm run db:seed

# 6. Run development server
npm run dev
```

เปิดเบราว์เซอร์ไปที่ [http://localhost:3077](http://localhost:3077)

### วิธีที่ 2: Setup ด้วย Docker (แนะนำ)

```bash
# 1. Clone repository
git clone <repository-url>
cd l-corner-manage

# 2. Setup environment variables
cp env.template .env

# 3. Start all services (PostgreSQL + App + PgAdmin)
docker-compose up -d

# 4. Setup database (รอ container พร้อมก่อน ~10 วินาที)
npm run db:generate
npm run db:push
npm run db:seed
```

เปิดเบราว์เซอร์ไปที่ [http://localhost:3077](http://localhost:3077)

---

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd l-corner-manage
```

### 2. Install Dependencies

```bash
npm install
```

หรือใช้ package manager อื่น:

```bash
# Yarn
yarn install

# pnpm
pnpm install
```

---

## Database Setup

### Option 1: ใช้ Docker (แนะนำ)

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# PostgreSQL จะรันที่ localhost:5436
```

### Option 2: ใช้ PostgreSQL ที่ติดตั้งในเครื่อง

1. สร้าง database ใหม่:

```sql
CREATE DATABASE l_corner_pos;
```

2. แก้ไข `DATABASE_URL` ใน `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/l_corner_pos?schema=public"
```

### Initialize Database

```bash
# 1. Generate Prisma Client
npm run db:generate

# 2. Push schema to database
npm run db:push

# 3. Seed initial data (admin user, roles, etc.)
npm run db:seed
```

> **Windows note:** if `npm run db:*` fails in PowerShell with "running scripts is disabled on this system", run it from Git Bash instead.

### Default Admin Credentials

หลังจาก seed database แล้ว ใช้ข้อมูลนี้ login:

- **Username:** `admin`
- **Password:** `admin123`

### Prisma Studio

```bash
npm run db:studio
```

Opens a database GUI at [http://localhost:5555](http://localhost:5555).

---

## Running the Application

### Development Mode

```bash
# Start development server (port 3077)
npm run dev

# หรือใช้ webpack แทน turbopack
npm run dev:webpack
```

เปิดเบราว์เซอร์ไปที่ [http://localhost:3077](http://localhost:3077)

### Production Mode

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## Docker Setup

### Start All Services

```bash
# Start PostgreSQL + App + PgAdmin
docker-compose up -d

# View logs
docker-compose logs -f
```

### Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Next.js App** | http://localhost:3077 | - |
| **PostgreSQL** | localhost:5436 | User: `postgres`<br>Password: `postgres`<br>Database: `l_corner_pos` |
| **PgAdmin** | http://localhost:5050 | Email: `admin@lcorner.local`<br>Password: `admin` |

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ ลบข้อมูลทั้งหมด)
docker-compose down -v
```

📖 **อ่านเพิ่มเติม:** [docs/guides/DOCKER.md](./docs/guides/DOCKER.md)

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Turbopack) on port 3077 |
| `npm run dev:webpack` | Start development server (Webpack) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Push schema to database (development) |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with initial data |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

---

## Project Structure

```
l-corner-manage/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── [locale]/            # Internationalized routes
│   │   ├── api/                 # API routes
│   │   ├── globals.css          # Global styles
│   │   └── layout.tsx           # Root layout
│   ├── components/
│   │   ├── pages/               # Page-specific components
│   │   │   └── [page]/
│   │   │       ├── index.tsx    # UI component
│   │   │       ├── helper.tsx   # Logic & hooks
│   │   │       └── configs.ts   # Form configs
│   │   └── ui/                  # Reusable UI components (shadcn)
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utilities & helpers
│   ├── constants/                # Shared enums/constants
│   └── proxy.ts                 # Next.js middleware (intl + auth gate)
├── auth.ts                       # NextAuth v5 config (root, outside src/)
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── seed.ts                  # Seed data
├── i18n/                        # Internationalization
│   ├── messages/
│   │   ├── en.json             # English translations
│   │   └── th.json             # Thai translations
│   ├── request.ts
│   └── routing.ts
├── docs/                        # Documentation
│   ├── guides/                  # How to work day-to-day (component pattern, inputs, Docker)
│   ├── architecture/            # Accurate current-state system docs (auth/roles, stock, media)
│   └── archive/                 # Superseded/historical docs, kept for context only
├── docker/                      # Docker configs
├── public/                      # Static files
├── .env                         # Environment variables (gitignored)
├── env.template                 # Environment template
├── docker-compose.yml           # Docker services
├── next.config.ts               # Next.js config
├── tsconfig.json                # TypeScript config
└── package.json                 # Dependencies & scripts
```

---

## Environment Variables

สร้างไฟล์ `.env` จาก template:

```bash
cp env.template .env
```

### สำคัญที่ต้องแก้ไข:

```env
# Database (ถ้าใช้ Docker ใช้ค่า default ได้เลย)
DATABASE_URL="postgresql://postgres:postgres@localhost:5436/l_corner_pos?schema=public"

# NextAuth (⚠️ ต้องเปลี่ยนใน production)
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
NEXTAUTH_URL="http://localhost:3077"

# App
NODE_ENV="development"
PORT=3077
```

📖 **ดูตัวอย่างครบ:** [env.template](./env.template)

---

## Documentation

📚 **เอกสารเพิ่มเติม:**

**Guides** (day-to-day patterns):
- **[docs/guides/COMPONENT_PATTERN.md](./docs/guides/COMPONENT_PATTERN.md)** - Component architecture (index/helper/configs split)
- **[docs/guides/INPUT_COMPONENTS.md](./docs/guides/INPUT_COMPONENTS.md)** - Using and extending the shared `Input` component
- **[docs/guides/DOCKER.md](./docs/guides/DOCKER.md)** - Docker setup & commands

**Architecture** (accurate current-state system docs):
- **[docs/architecture/AUTH_ROLES.md](./docs/architecture/AUTH_ROLES.md)** - User/Role/UserRole structure & permissions
- **[docs/architecture/STOCK_MANAGEMENT.md](./docs/architecture/STOCK_MANAGEMENT.md)** - `StockMovement`-based inventory system
- **[docs/architecture/IMAGE_UPLOAD_SYSTEM.md](./docs/architecture/IMAGE_UPLOAD_SYSTEM.md)** - Media/ProductMedia design

> Older planning/migration docs (original POS spec, superseded stock-management drafts, rejected auth migration approach) were deleted rather than archived — they described designs that were never built or were later replaced, and the docs above already reflect the current, accurate state.

---

## Tech Stack

### Core

- **[Next.js 16+](https://nextjs.org/)** - React framework with App Router
- **[TypeScript 5+](https://www.typescriptlang.org/)** - Type safety
- **[PostgreSQL 16+](https://www.postgresql.org/)** - Database
- **[Prisma](https://www.prisma.io/)** - ORM & database toolkit

### UI & Styling

- **[Tailwind CSS v4](https://tailwindcss.com/)** - Utility-first CSS
- **[shadcn/ui](https://ui.shadcn.com/)** - Accessible component library
- **[Radix UI](https://www.radix-ui.com/)** - Headless UI primitives
- **[Lucide Icons](https://lucide.dev/)** - Icon library

### State & Data

- **[Zustand](https://zustand-demo.pmnd.rs/)** - Client state management
- **[TanStack Query](https://tanstack.com/query)** - Server state & caching
- **[React Hook Form](https://react-hook-form.com/)** - Form handling
- **[Zod](https://zod.dev/)** - Schema validation

### Features

- **[NextAuth.js](https://next-auth.js.org/)** - Authentication
- **[next-intl](https://next-intl-docs.vercel.app/)** - Internationalization (th, en)
- **[Recharts](https://recharts.org/)** - Charts & analytics
- **[date-fns](https://date-fns.org/)** - Date utilities

---

## Troubleshooting

### Port Already in Use

```bash
# Windows: ตรวจสอบ port 3077
netstat -ano | findstr :3077

# เปลี่ยน port ใน .env
PORT=3078
```

### Database Connection Failed

```bash
# ตรวจสอบว่า PostgreSQL รันอยู่หรือไม่
docker-compose ps postgres

# ดู logs
docker-compose logs postgres

# ตรวจสอบ DATABASE_URL ใน .env
```

### Prisma Client Not Generated

```bash
# Generate Prisma Client ใหม่
npm run db:generate

# ถ้ายังไม่ได้ ลบแล้ว generate ใหม่
rm -rf node_modules/.prisma
npm run db:generate
```

### Module Not Found

```bash
# ติดตั้ง dependencies ใหม่
rm -rf node_modules package-lock.json
npm install
```

### Docker Container Won't Start

```bash
# ลบ containers และ volumes
docker-compose down -v

# Rebuild
docker-compose up -d --build --force-recreate
```

---

## Development Workflow

### 1. สร้าง Feature ใหม่

```bash
# 1. สร้าง branch ใหม่
git checkout -b feature/your-feature

# 2. เขียนโค้ดตาม pattern ใน docs/guides/COMPONENT_PATTERN.md

# 3. Test
npm run dev

# 4. Commit
git add .
git commit -m "feat: add your feature"

# 5. Push
git push origin feature/your-feature
```

### 2. Database Changes

```bash
# 1. แก้ไข prisma/schema.prisma

# 2. Push schema (development)
npm run db:push

# 3. Generate Prisma Client
npm run db:generate

# 4. (Optional) Create migration
npx prisma migrate dev --name your_migration_name
```

### 3. Add New Translation

```bash
# แก้ไข i18n/messages/th.json และ en.json
# ใช้ใน component:
const t = useTranslations('namespace');
t('key')
```

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Follow code patterns in `docs/guides/COMPONENT_PATTERN.md`
4. Commit changes (`git commit -m 'feat: add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

---

## License

This project is private and proprietary.

---

## Support

หากมีปัญหา:

1. ตรวจสอบ [Troubleshooting](#troubleshooting)
2. ดู logs: `docker-compose logs` หรือ `npm run dev`
3. อ่าน documentation ใน `docs/`
4. ตรวจสอบ `.env` configuration

---

**Happy Coding! 🚀**
