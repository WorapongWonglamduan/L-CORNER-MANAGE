import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { deleteImage } from "@/lib/image-upload";
import { resolveMediaShopId } from "@/lib/media-ownership";

/**
 * API endpoint to cleanup orphan media files
 * DELETE /api/media/cleanup
 */
export async function DELETE() {
  const session = await auth();
  const denied = requirePermission(session, "settings.update");
  if (denied) return denied;

  try {
    console.log("🔍 Finding orphan media records...");

    // Find all media that don't have ProductMedia relations
    const allMedia = await prisma.media.findMany({
      include: {
        product_images: true,
      },
    });

    const candidates = allMedia.filter(
      (media) => media.product_images.length === 0
    );

    // Only clean up orphans this caller's shop actually owns — an
    // unresolvable/other-shop entity_type/entity_id is left alone rather
    // than deleted, since this bulk maintenance action has no per-row
    // permission check otherwise.
    const orphanMedia = session!.user.is_super_admin
      ? candidates
      : (
          await Promise.all(
            candidates.map(async (media) => ({
              media,
              shopId: await resolveMediaShopId(media),
            })),
          )
        )
          .filter(({ shopId }) => shopId === session!.user.shop_id)
          .map(({ media }) => media);

    console.log(`Found ${orphanMedia.length} orphan media records`);

    if (orphanMedia.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No orphan media to clean up",
        deleted: 0,
      });
    }

    // Delete files and records
    let deletedFiles = 0;
    let deletedRecords = 0;
    const errors: string[] = [];

    for (const media of orphanMedia) {
      console.log(`Deleting: ${media.filename} (${media.id})`);

      // Goes through the active StorageDriver (local disk or R2) rather
      // than fs.unlink directly — this used to only ever delete local
      // files, so switching STORAGE_DRIVER to r2 would have silently left
      // every orphaned file behind in the bucket forever while still
      // deleting the DB record.
      try {
        await deleteImage(media.file_path, media.thumbnail_path, media.medium_path);
        deletedFiles += [media.file_path, media.thumbnail_path, media.medium_path].filter(
          Boolean,
        ).length;
        console.log(`  ✓ Deleted files for: ${media.filename}`);
      } catch (error) {
        const errorMsg = `Failed to delete files for: ${media.filename}`;
        console.log(`  ✗ ${errorMsg}`, error);
        errors.push(errorMsg);
      }

      // Delete media record
      try {
        await prisma.media.delete({
          where: { id: media.id },
        });
        deletedRecords++;
        console.log(`  ✓ Deleted record: ${media.id}`);
      } catch (error) {
        const errorMsg = `Failed to delete record: ${media.id}`;
        console.log(`  ✗ ${errorMsg}`, error);
        errors.push(errorMsg);
      }
    }

    console.log("\n📊 Cleanup Summary:");
    console.log(`   Files deleted: ${deletedFiles}`);
    console.log(`   Records deleted: ${deletedRecords}`);
    console.log("✅ Cleanup completed!");

    return NextResponse.json({
      success: true,
      message: "Cleanup completed",
      summary: {
        orphanFound: orphanMedia.length,
        filesDeleted: deletedFiles,
        recordsDeleted: deletedRecords,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to cleanup orphan media",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
