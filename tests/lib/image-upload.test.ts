import { describe, it, expect } from "vitest";
import path from "path";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import sharp from "sharp";
import { uploadImage, deleteImage, validateImage, ImageUploadError } from "@/lib/image-upload";

// Real end-to-end check (sharp read + LocalStorageDriver together, not
// mocked) that the storage-driver refactor didn't break the actual upload
// path — a genuine PNG buffer in, a real file under public/uploads/ out.
//
// Cleanup is deliberately per-file via deleteImage() with the exact path
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

  it("saves a single original file under a per-upload UUID folder, keeping the original filename", async () => {
    const file = await makeTestFile("รูปสินค้า test (1).png");
    // "vitest-image-upload-spec" — sanitizeFolder allows any
    // [a-zA-Z0-9_-]+ string, this just has to be distinctive enough that
    // it can never collide with a real product's upload folder.
    const result = await uploadImage(file, { folder: "vitest-image-upload-spec" });

    try {
      // <uuid>/<original-filename> — no "original/thumbnail/medium"
      // subfolders anymore, since only one variant is ever generated.
      expect(result.filePath).toMatch(
        /^\/uploads\/\d{4}\/\d{2}\/vitest-image-upload-spec\/[0-9a-f-]{36}\/.+\.png$/,
      );
      expect(result.storedFilename).toBe("รูปสินค้า test (1).png");
      expect(result.filePath).toContain("รูปสินค้า test (1).png");
      expect(result.width).toBe(20);
      expect(result.height).toBe(20);

      const fullPath = path.join(process.cwd(), "public", result.filePath);
      expect(existsSync(fullPath)).toBe(true);
      expect((await readFile(fullPath)).length).toBeGreaterThan(0);
    } finally {
      await deleteImage(result.filePath);
    }
  });

  it("sanitizes an unsafe filename instead of writing outside its UUID folder", async () => {
    const file = await makeTestFile("../../../etc/passwd.png");
    const result = await uploadImage(file, { folder: "vitest-image-upload-spec" });
    try {
      // Only the last path segment survives, path separators stripped —
      // stays inside its own UUID folder, never escapes it.
      expect(result.filePath).not.toContain("..");
      expect(result.storedFilename).toBe("passwd.png");
    } finally {
      await deleteImage(result.filePath);
    }
  });

  it("sanitizes a path-traversal folder instead of writing outside uploads/", async () => {
    const file = await makeTestFile();
    // Falls back to "general" — same guard as image-upload.ts's
    // SAFE_FOLDER — which is also the default folder real uploads land in,
    // so this test must clean up only the exact file it created (via
    // deleteImage with the exact returned path), never anything folder-wide.
    const result = await uploadImage(file, { folder: "../../../etc" });
    try {
      expect(result.filePath).toMatch(/^\/uploads\/\d{4}\/\d{2}\/general\//);
    } finally {
      await deleteImage(result.filePath);
    }
  });

  it("deleteImage removes the file a real upload created", async () => {
    const file = await makeTestFile();
    const result = await uploadImage(file, { folder: "vitest-image-upload-spec" });

    await deleteImage(result.filePath);

    const fullPath = path.join(process.cwd(), "public", result.filePath);
    expect(existsSync(fullPath)).toBe(false);
  });

  it("deleteImage still cleans up thumbnail/medium files from before this app version", async () => {
    // Simulates an old Media row uploaded before thumbnail/medium
    // generation was removed — deleteImage must still take and clean up
    // those paths if given them, since real historical rows still have them.
    const file = await makeTestFile();
    const original = await uploadImage(file, { folder: "vitest-image-upload-spec" });
    const thumbnail = await uploadImage(await makeTestFile(), {
      folder: "vitest-image-upload-spec",
    });

    await deleteImage(original.filePath, thumbnail.filePath, null);

    expect(existsSync(path.join(process.cwd(), "public", original.filePath))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "public", thumbnail.filePath))).toBe(false);
  });
});
