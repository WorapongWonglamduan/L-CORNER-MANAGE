# L-Corner POS System - Setup Guide
## Quick Start Instructions

> **Note:** Use **Git Bash** terminal instead of PowerShell to avoid execution policy issues.

---

## 📋 Prerequisites

- [x] Docker Desktop installed and running
- [x] Node.js 20+ installed
- [x] Git Bash terminal (recommended for Windows)

---

## 🚀 Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 16.1.6
- Prisma 7.4.2
- React Query, Zustand, Next-intl
- Radix UI components
- Form validation (react-hook-form + zod)
- Utilities (decimal.js, date-fns, recharts)

### 2. Setup Environment Variables

```bash
# Copy template to .env
cp env.template .env

# Edit .env if needed (default values work for local development)
```

Default configuration:
- **PostgreSQL Port:** 5435
- **Database:** l_corner_pos
- **App Port:** 3077
- **PgAdmin Port:** 5050

### 3. Start Docker Services

```bash
# Start PostgreSQL + PgAdmin
docker-compose up -d

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f postgres
```

### 4. Initialize Database

```bash
# Generate Prisma Client
npm run db:generate

# Create database schema
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3077](http://localhost:3077)

---

## 🗄️ Database Access

### Via PgAdmin (Web Interface)

1. Open [http://localhost:5050](http://localhost:5050)
2. Login:
   - Email: `admin@lcorner.local`
   - Password: `admin`
3. Add Server:
   - Name: `L-Corner POS`
   - Host: `postgres` (or `localhost`)
   - Port: `5432` (internal) or `5435` (external)
   - Database: `l_corner_pos`
   - Username: `postgres`
   - Password: `postgres`

### Via Prisma Studio

```bash
npm run db:studio
```

Opens at [http://localhost:5555](http://localhost:5555)

### Via PostgreSQL CLI

```bash
# Connect to database
docker exec -it l-corner-postgres psql -U postgres -d l_corner_pos

# Common commands
\dt              # List tables
\d products      # Describe table
SELECT * FROM products LIMIT 5;
\q               # Quit
```

---

## 📦 Seeded Data

After running `npm run db:seed`, you'll have:

### Units
- ชิ้น (Piece), กรัม (Gram), กิโลกรัม (Kilogram)
- มิลลิลิตร (Milliliter), ลิตร (Liter)
- แก้ว (Cup), ขวด (Bottle), แพ็ค (Pack)

### Categories
- เครื่องดื่ม → กาแฟ, ชา
- ขนมขบเคี้ยว
- อาหารสำเร็จรูป

### Products

**Made-to-Order (ปรุงเอง):**
- ลาเต้ (Latte) - 45 บาท
  - Recipe: เมล็ดกาแฟ 18g + นมสด 200ml + น้ำตาล 10g
- ชาเขียว (Green Tea) - 35 บาท
  - Recipe: ใบชาเขียว 5g + น้ำตาล 15g

**Finished Goods (สำเร็จรูป):**
- มาม่าคัพ (Cup Noodles) - 15 บาท
- มันฝรั่งทอด (Potato Chips) - 20 บาท

**Raw Materials (วัตถุดิบ):**
- เมล็ดกาแฟ (Coffee Beans) - 5000g in stock
- นมสด (Fresh Milk) - 10000ml in stock
- น้ำตาล (Sugar) - 3000g in stock
- ใบชาเขียว (Green Tea Leaves) - 1000g in stock

### Toppings
- ไข่มุก (Tapioca Pearl) - +10 บาท
- วิปครีม (Whipped Cream) - +15 บาท

### Other Data
- 1 Warehouse (คลังหลัก)
- 1 Sample Customer
- 1 Sample Supplier

---

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Push schema without migration |
| `npm run db:migrate` | Create and apply migration |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset database (⚠️ deletes all data) |

---

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v

# Rebuild containers
docker-compose up -d --build
```

---

## 📁 Project Structure

```
l-corner-manage/
├── app/                    # Next.js App Router
├── components/             # React components
├── lib/
│   ├── prisma.ts          # Prisma client instance
│   └── utils.ts           # Utility functions
├── prisma/
│   ├── schema.prisma      # Database schema (473 lines)
│   └── seed.ts            # Seed data script
├── docker/
│   └── postgres/
│       └── init/
│           └── 01-init.sql # Database initialization
├── docker-compose.yml     # Docker services config
├── Dockerfile             # Production image
├── Dockerfile.dev         # Development image
├── .dockerignore          # Docker ignore patterns
├── env.template           # Environment variables template
├── .env                   # Your local environment (gitignored)
├── package.json           # Dependencies & scripts
├── DOCKER.md              # Docker documentation
├── SETUP.md               # This file
└── POS_System_Spec.md     # Full system specification
```

---

## 🔧 Troubleshooting

### PowerShell Execution Policy Error

**Error:** `running scripts is disabled on this system`

**Solution:** Use **Git Bash** instead of PowerShell:
```bash
# In Git Bash
npm run db:generate
```

### Port Already in Use

```bash
# Check what's using port 5435
netstat -ano | findstr :5435

# Change port in docker-compose.yml if needed
```

### Database Connection Failed

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Prisma Client Not Generated

```bash
# Delete and regenerate
rm -rf node_modules/.prisma
npm run db:generate
```

### Docker Build Fails

```bash
# Clean rebuild
docker-compose down -v
docker-compose up -d --build --force-recreate
```

---

## 🎯 Next Steps

1. **Create First Migration:**
   ```bash
   npm run db:migrate
   # Name: "initial_schema"
   ```

2. **Explore Database:**
   ```bash
   npm run db:studio
   ```

3. **Start Building UI:**
   - Create pages in `app/[locale]/(dashboard)/`
   - Follow spec in `POS_System_Spec.md`

4. **Review Documentation:**
   - `POS_System_Spec.md` - Full system specification
   - `DOCKER.md` - Docker details
   - `README.md` - Project overview

---

## 📚 Key Technologies

- **Next.js 16.1.6** - React framework with App Router
- **PostgreSQL 16** - Database (port 5435)
- **Prisma 7.4.2** - ORM & migrations
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Styling
- **Radix UI** - Accessible components
- **React Query** - Server state management
- **Zustand** - Client state management
- **next-intl** - i18n (Thai/English)
- **decimal.js** - Precise calculations

---

## 🔐 Security Notes

⚠️ **For Production:**

1. Change default passwords in `.env`
2. Generate strong `NEXTAUTH_SECRET`
3. Enable SSL for database
4. Use environment-specific configs
5. Never commit `.env` to git
6. Implement proper authentication
7. Add rate limiting
8. Regular security updates

---

## 📞 Support

- Check `POS_System_Spec.md` for detailed specifications
- Review `DOCKER.md` for Docker-specific issues
- Check Docker logs: `docker-compose logs -f`
- Verify environment: `.env` file

---

**Happy Coding! 🚀**
