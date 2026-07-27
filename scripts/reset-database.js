const { execSync } = require('child_process');
const path = require('path');

console.log('🗑️  Starting complete database reset...\n');
console.log('⚠️  WARNING: This will drop ALL tables including _prisma_migrations\n');

try {
  // Step 1: Reset database completely using Prisma
  console.log('📋 Step 1: Dropping entire database and recreating...');
  console.log('   Running: npx prisma migrate reset --force\n');
  
  execSync('npx prisma migrate reset --force', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n✅ Database reset completed\n');
  
  // Step 2: Generate Prisma Client
  console.log('📋 Step 2: Generating Prisma Client...');
  execSync('npx prisma generate', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Prisma Client generated successfully\n');
  
  console.log('🎉 Complete database reset finished!');
  console.log('   ✓ All tables dropped and recreated from schema');
  console.log('   ✓ All migrations applied');
  console.log('   ✓ Seed data inserted (if configured)');
  console.log('   ✓ Prisma Client regenerated\n');
  
} catch (error) {
  console.error('❌ Error during database reset:', error.message);
  console.error('\nTroubleshooting:');
  console.error('   1. Make sure your .env file has correct DB_HOST/DB_PORT/DB_DATABASE/DB_USERNAME/DB_PASSWORD');
  console.error('   2. Ensure PostgreSQL is running');
  console.error('   3. Check if you have migrations in prisma/migrations folder\n');
  process.exit(1);
}
