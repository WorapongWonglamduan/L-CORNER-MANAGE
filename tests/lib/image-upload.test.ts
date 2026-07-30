import { describe, it, expect } from "vitest";
import path from "path";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import sharp from "sharp";
import { uploadImage, deleteImage, validateImage, ImageUploadError } from "@/lib/image-upload";

// Real end-to-end check (sharp resize + LocalStorageDriver together, not
// mocked) that the storage-driver refactor didn't break the actual upload
// path — a genuine PNG buffer in, real files under public/uploads/ out.
//
// Cleanup is deliberately per-file via deleteImage() with the exact paths
// each test's own upload returned — never a folder-level rm(). A test here
// once recursively deleted the whole public/uploads/ directory in
// afterEach, wiping every real uploaded product image on disk (recovered
// via `git restore public/uploads/`). Folder-level cleanup in a test that
// shares a filesystem with real uploaded data is never safe.
describe("uploadImage / deleteImage (local driver, end-to-end)", () => {
  async function makeTestFile(name = "test.png") {
    const buffer = await sharp({
      create: { width: 20, height: 20, channels: 3, background: { r: 200, g: 50, b: 50 } },
    })
      .png()
      .toBuffer();
    return new File([new Uint8Array(buffer)], name, { type: "image/png" });
  }

  it("rejects a file over the size limit", async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB > default 5MB
    const file = new File([new Uint8Array(bigBuffer)], "big.png", { type: "image/png" });
    await expect(validateImage(file)).rejects.toThrow(ImageUploadError);
  });

  it("rejects a disallowed MIME type", async () => {
    const file = new File([new Uint8Array(10)], "file.exe", {
      type: "application/x-msdownload",
    });
    await expect(validateImage(file)).rejects.toThrow(ImageUploadError);
  });

  it("saves original + thumbnail + medium as real files and reports correct URLs", async () => {
    const file = await makeTestFile();
    // "test-only-<random-ish>" folder name — sanitizeFolder allows any
    // [a-zA-Z0-9_-]+ string, this just has to be distinctive enough that
    // it can never collide with a real product's upload folder.
    const result = await uploadImage(file, { folder: "vitest-image-upload-spec" });

    try {
      expect(result.filePath).toMatch(
        /^\/uploads\/\d{4}\/\d{2}\/vitest-image-upload-spec\/original\/.+\.png$/,
      );
      expect(result.thumbnailPath).toMatch(/\/thumbnail\//);
      expect(result.mediumPath).toMatch(/\/medium\//);
      expect(result.width).toBe(20);
      expect(result.height).toBe(20);

      for (const url of [result.filePath, result.thumbnailPath, result.mediumPath]) {
        const fullPath = path.join(process.cwd(), "public", url!);
        expect(existsSync(fullPath)).toBe(true);
        expect((await readFile(fullPath)).length).toBeGreaterThan(0);
      }
    } finally {
      await deleteImage(result.filePath, result.thumbnailPath, result.mediumPath);
    }
  });

  it("sanitizes a path-traversal folder instead of writing outside uploads/", async () => {
    const file = await makeTestFile();
    // Falls back to "general" — same guard as image-upload.ts's
    // SAFE_FOLDER — which is also the default folder real uploads land in,
    // so this test must clean up only the exact file it created (via
    // deleteImage with the exact returned paths), never anything folder-wide.
    const result = await uploadImage(file, { folder: "../../../etc" });
    try {
      expect(result.filePath).toMatch(/^\/uploads\/\d{4}\/\d{2}\/general\/original\//);
    } finally {
      await deleteImage(result.filePath, result.thumbnailPath, result.mediumPath);
    }
  });

  it("deleteImage removes all three variants a real upload created", async () => {
    const file = await makeTestFile();
    const result = await uploadImage(file, { folder: "vitest-image-upload-spec" });

    await deleteImage(result.filePath, result.thumbnailPath, result.mediumPath);

    for (const url of [result.filePath, result.thumbnailPath, result.mediumPath]) {
      const fullPath = path.join(process.cwd(), "public", url!);
      expect(existsSync(fullPath)).toBe(false);
    }
  });
});
