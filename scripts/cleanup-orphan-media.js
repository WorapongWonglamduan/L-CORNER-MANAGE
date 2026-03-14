/**
 * Script to cleanup orphan media files
 * - Delete media records that don't have ProductMedia relations
 * - Delete actual files from filesystem
 */

const { unlink } = require('fs/promises');
const { existsSync } = require('fs');
const path = require('path');

// Import prisma instance from lib
const prismaModule = require('../src/lib/prisma.ts');
const prisma = prismaModule.default || prismaModule.prisma;

async function cleanupOrphanMedia() {
  try {
    console.log('🔍 Finding orphan media records...\n');

    // Find all media that don't have ProductMedia relations
    const allMedia = await prisma.media.findMany({
      include: {
        product_images: true,
      },
    });

    const orphanMedia = allMedia.filter(media => media.product_images.length === 0);

    console.log(`Found ${orphanMedia.length} orphan media records\n`);

    if (orphanMedia.length === 0) {
      console.log('✅ No orphan media to clean up!');
      return;
    }

    // Delete files and records
    let deletedFiles = 0;
    let deletedRecords = 0;

    for (const media of orphanMedia) {
      console.log(`Deleting: ${media.filename} (${media.id})`);

      // Delete files from filesystem
      const filesToDelete = [
        media.file_path,
        media.thumbnail_path,
        media.medium_path,
      ].filter(Boolean);

      for (const filePath of filesToDelete) {
        const fullPath = path.join(process.cwd(), 'public', filePath);
        if (existsSync(fullPath)) {
          try {
            await unlink(fullPath);
            deletedFiles++;
            console.log(`  ✓ Deleted file: ${filePath}`);
          } catch (error) {
            console.log(`  ✗ Failed to delete file: ${filePath}`, error.message);
          }
        }
      }

      // Delete media record
      try {
        await prisma.media.delete({
          where: { id: media.id },
        });
        deletedRecords++;
        console.log(`  ✓ Deleted record: ${media.id}\n`);
      } catch (error) {
        console.log(`  ✗ Failed to delete record: ${media.id}`, error.message);
      }
    }

    console.log('\n📊 Cleanup Summary:');
    console.log(`   Files deleted: ${deletedFiles}`);
    console.log(`   Records deleted: ${deletedRecords}`);
    console.log('\n✅ Cleanup completed!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run cleanup
cleanupOrphanMedia()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
