# Docker Setup Guide
## L-Corner POS System

> **PostgreSQL Port:** 5435 (mapped from container port 5432)

---

## Prerequisites

- Docker Desktop installed
- Docker Compose installed
- Node.js 20+ (for local development)

---

## Quick Start

### 1. Setup Environment Variables

```bash
# Copy the template file
cp env.template .env

# Edit .env and update the values as needed
```

### 2. Start Services

```bash
# Start all services (PostgreSQL + App + PgAdmin)
docker-compose up -d

# Or start only database
docker-compose up -d postgres

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f postgres
docker-compose logs -f app
```

### 3. Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

### 4. Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Next.js App** | http://localhost:3077 | - |
| **PostgreSQL** | localhost:5435 | User: `postgres`<br>Password: `postgres`<br>Database: `l_corner_pos` |
| **PgAdmin** | http://localhost:5050 | Email: `admin@lcorner.local`<br>Password: `admin` |

---

## Docker Commands

### Container Management

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v

# Restart services
docker-compose restart

# Restart specific service
docker-compose restart postgres

# Rebuild containers
docker-compose up -d --build

# View running containers
docker-compose ps
```

### Database Management

```bash
# Access PostgreSQL CLI
docker exec -it l-corner-postgres psql -U postgres -d l_corner_pos

# Backup database
docker exec l-corner-postgres pg_dump -U postgres l_corner_pos > backup.sql

# Restore database
docker exec -i l-corner-postgres psql -U postgres -d l_corner_pos < backup.sql

# View database size
docker exec l-corner-postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('l_corner_pos'));"
```

### Logs & Debugging

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View last 100 lines
docker-compose logs --tail=100

# View specific service logs
docker-compose logs postgres
docker-compose logs app
docker-compose logs pgadmin
```

---

## Development Workflow

### Option 1: Docker Development (Recommended)

```bash
# Start all services
docker-compose up -d

# App runs on http://localhost:3000 with hot-reload
# Database on localhost:5435
```

### Option 2: Local Development + Docker Database

```bash
# Start only database
docker-compose up -d postgres pgadmin

# Run app locally
npm run dev

# Database connection: localhost:5435
```

---

## PgAdmin Setup

1. Open http://localhost:5050
2. Login with credentials from `.env`
3. Add new server:
   - **Name:** L-Corner POS
   - **Host:** postgres (or localhost if running locally)
   - **Port:** 5432 (internal) or 5435 (external)
   - **Database:** l_corner_pos
   - **Username:** postgres
   - **Password:** postgres

---

## Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Format schema
npx prisma format

# Validate schema
npx prisma validate
```

---

## Production Deployment

### Build Production Image

```bash
# Build production image
docker build -t l-corner-pos:latest .

# Run production container
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e NEXTAUTH_SECRET="your-secret" \
  l-corner-pos:latest
```

### Production Compose

```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d
```

---

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 5435
netstat -ano | findstr :5435

# Stop the service or change port in docker-compose.yml
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Verify connection string in .env
# Should be: postgresql://postgres:postgres@localhost:5435/l_corner_pos
```

### Container Won't Start

```bash
# Remove old containers and volumes
docker-compose down -v

# Rebuild from scratch
docker-compose up -d --build --force-recreate
```

### Prisma Client Not Generated

```bash
# Generate Prisma Client
npx prisma generate

# If still failing, delete and regenerate
rm -rf node_modules/.prisma
npx prisma generate
```

---

## File Structure

```
l-corner-manage/
├── docker/
│   └── postgres/
│       └── init/
│           └── 01-init.sql          # Database initialization
├── prisma/
│   ├── schema.prisma                # Database schema
│   └── seed.ts                      # Seed data
├── .dockerignore                    # Docker ignore patterns
├── .env                             # Environment variables (gitignored)
├── docker-compose.yml               # Docker services configuration
├── Dockerfile                       # Production image
├── Dockerfile.dev                   # Development image
├── env.template                     # Environment template
└── DOCKER.md                        # This file
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | Database user | `postgres` |
| `POSTGRES_PASSWORD` | Database password | `postgres` |
| `POSTGRES_DB` | Database name | `l_corner_pos` |
| `DATABASE_URL` | Prisma connection string | See env.template |
| `NEXTAUTH_SECRET` | NextAuth secret key | Required |
| `NODE_ENV` | Environment | `development` |

---

## Security Notes

⚠️ **Important for Production:**

1. Change default PostgreSQL password
2. Generate strong `NEXTAUTH_SECRET`
3. Use environment-specific `.env` files
4. Don't commit `.env` to git
5. Enable SSL for database connections
6. Use secrets management (Docker Secrets, Vault, etc.)
7. Limit exposed ports
8. Regular security updates

---

## Performance Optimization

### PostgreSQL Tuning

Edit `docker-compose.yml` to add PostgreSQL configuration:

```yaml
postgres:
  command:
    - "postgres"
    - "-c"
    - "max_connections=200"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "effective_cache_size=1GB"
    - "-c"
    - "work_mem=16MB"
```

### Next.js Optimization

```bash
# Build optimized production image
docker build --target runner -t l-corner-pos:prod .

# Enable output: 'standalone' in next.config.js
```

---

## Backup Strategy

### Automated Backups

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec l-corner-postgres pg_dump -U postgres l_corner_pos > "backups/backup_${DATE}.sql"
find backups/ -name "*.sql" -mtime +7 -delete
EOF

chmod +x backup.sh

# Add to crontab (daily at 2 AM)
0 2 * * * /path/to/backup.sh
```

---

## Support

For issues or questions:
- Check logs: `docker-compose logs`
- Review spec: `POS_System_Spec.md`
- Verify environment: `.env`
