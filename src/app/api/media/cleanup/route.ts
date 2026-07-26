import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

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

    const orphanMedia = allMedia.filter(
      (media) => media.product_images.length === 0
    );

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

      // Delete files from filesystem
      const filesToDelete = [
        media.file_path,
        media.thumbnail_path,
        media.medium_path,
      ].filter(Boolean) as string[];

      for (const filePath of filesToDelete) {
        const fullPath = path.join(process.cwd(), "public", filePath);
        if (existsSync(fullPath)) {
          try {
            await unlink(fullPath);
            deletedFiles++;
            console.log(`  ✓ Deleted file: ${filePath}`);
          } catch (error) {
            const errorMsg = `Failed to delete file: ${filePath}`;
            console.log(`  ✗ ${errorMsg}`, error);
            errors.push(errorMsg);
          }
        }
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
