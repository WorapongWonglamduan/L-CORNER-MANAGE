require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

async function pushSchema() {
  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is not set')
    process.exit(1)
  }

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
