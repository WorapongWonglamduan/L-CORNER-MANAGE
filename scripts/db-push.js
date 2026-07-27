require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

async function pushSchema() {
  const { DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD } = process.env

  if (!DB_HOST || !DB_PORT || !DB_DATABASE || !DB_USERNAME || !DB_PASSWORD) {
    console.error('❌ DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD environment variables must be set')
    process.exit(1)
  }

  const connectionString = `postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}?schema=public`

  const pool = new Pool({ connectionString })

  try {
    console.log('🔄 Pushing schema to database...')
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '..', 'prisma', 'migrations', 'schema.sql')
    
    if (!fs.existsSync(sqlPath)) {
      console.log('⚠️  No schema.sql found. Creating tables from Prisma schema...')
      console.log(`ℹ️  Run: npx prisma db push --url="${connectionString}"`)
      
      // Use Prisma CLI to push schema with URL parameter
      const { execSync } = require('child_process')
      execSync(`npx prisma db push --url="${connectionString}"`, { 
        stdio: 'inherit',
        env: { ...process.env }
      })
      
      console.log('✅ Schema pushed successfully!')
      return
    }

    const sql = fs.readFileSync(sqlPath, 'utf-8')
    
    // Execute the SQL
    await pool.query(sql)
    
    console.log('✅ Schema pushed successfully!')
  } catch (error) {
    console.error('❌ Error pushing schema:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

pushSchema()
