import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";
import { existsSync } from "fs";
import { readFile, rm } from "fs/promises";
import { LocalStorageDriver } from "@/lib/storage/local-driver";

describe("LocalStorageDriver", () => {
  const driver = new LocalStorageDriver();
  const testKey = "uploads/test-only/storage-driver-spec/file.txt";
  const testFullPath = path.join(process.cwd(), "public", testKey);

  afterEach(async () => {
    await rm(path.join(process.cwd(), "public", "uploads", "test-only"), {
      recursive: true,
      force: true,
    });
  });

  it("put() writes the buffer to public/<key> and returns a leading-slash URL", async () => {
    const url = await driver.put(Buffer.from("hello"), testKey, "text/plain");
    expect(url).toBe("/uploads/test-only/storage-driver-spec/file.txt");
    expect(existsSync(testFullPath)).toBe(true);
    expect((await readFile(testFullPath, "utf8"))).toBe("hello");
  });

  it("deleteByUrl() removes the file put() created", async () => {
    await driver.put(Buffer.from("hello"), testKey, "text/plain");
    expect(existsSync(testFullPath)).toBe(true);

    await driver.deleteByUrl("/uploads/test-only/storage-driver-spec/file.txt");
    expect(existsSync(testFullPath)).toBe(false);
  });

  it("deleteByUrl() on a URL that was never written is a no-op, not an error", async () => {
    await expect(
      driver.deleteByUrl("/uploads/test-only/never-existed.txt"),
    ).resolves.toBeUndefined();
  });
});

// The AWS SDK client is mocked — there's no real R2 bucket to test
// against in CI/local dev (per Cloudflare's own docs, R2's S3-compatible
// API can't be exercised via local Workers tooling either; only a real
// bucket or a separate S3-compatible emulator like MinIO would do). This
// verifies the driver builds the right commands/URLs, not real network
// behavior.
const sendMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("@aws-sdk/client-s3", () => {
  class FakePutObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  class FakeDeleteObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  class FakeS3Client {
    send = sendMock;
  }
  return {
    S3Client: FakeS3Client,
    PutObjectCommand: FakePutObjectCommand,
    DeleteObjectCommand: FakeDeleteObjectCommand,
  };
});

describe("R2StorageDriver", () => {
  const ENV_KEYS = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_BASE_URL",
  ];
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    sendMock.mockClear();
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
    process.env.R2_ACCOUNT_ID = "test-account";
    process.env.R2_ACCESS_KEY_ID = "test-access-key";
    process.env.R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.R2_BUCKET_NAME = "test-bucket";
    process.env.R2_PUBLIC_BASE_URL = "https://images.example.com";
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it("throws a clear error when a required env var is missing", async () => {
    delete process.env.R2_BUCKET_NAME;
    const { R2StorageDriver } = await import("@/lib/storage/r2-driver");
    expect(() => new R2StorageDriver()).toThrow(/R2_BUCKET_NAME/);
  });

  it("put() uploads to the bucket and returns publicBaseUrl + key", async () => {
    const { R2StorageDriver } = await import("@/lib/storage/r2-driver");
    const driver = new R2StorageDriver();
    const url = await driver.put(Buffer.from("hi"), "uploads/2026/07/general/original/x.jpg", "image/jpeg");

    expect(url).toBe("https://images.example.com/uploads/2026/07/general/original/x.jpg");
    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0];
    expect(command.input).toMatchObject({
      Bucket: "test-bucket",
      Key: "uploads/2026/07/general/original/x.jpg",
      ContentType: "image/jpeg",
    });
  });

  it("deleteByUrl() strips the public base URL and deletes by the remaining key", async () => {
    const { R2StorageDriver } = await import("@/lib/storage/r2-driver");
    const driver = new R2StorageDriver();
    await driver.deleteByUrl("https://images.example.com/uploads/2026/07/general/original/x.jpg");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0];
    expect(command.input).toMatchObject({
      Bucket: "test-bucket",
      Key: "uploads/2026/07/general/original/x.jpg",
    });
  });

  it("deleteByUrl() is a no-op for a URL that isn't under this driver's public base URL", async () => {
    const { R2StorageDriver } = await import("@/lib/storage/r2-driver");
    const driver = new R2StorageDriver();
    await driver.deleteByUrl("/uploads/2026/07/general/original/local-leftover.jpg");

    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("getStorageDriver", () => {
  const originalDriverEnv = process.env.STORAGE_DRIVER;

  afterEach(async () => {
    if (originalDriverEnv === undefined) delete process.env.STORAGE_DRIVER;
    else process.env.STORAGE_DRIVER = originalDriverEnv;
    const { _resetStorageDriverForTests } = await import("@/lib/storage");
    _resetStorageDriverForTests();
  });

  it("defaults to LocalStorageDriver when STORAGE_DRIVER is unset", async () => {
    delete process.env.STORAGE_DRIVER;
    const { getStorageDriver } = await import("@/lib/storage");
    const { LocalStorageDriver } = await import("@/lib/storage/local-driver");
    expect(getStorageDriver()).toBeInstanceOf(LocalStorageDriver);
  });

  it("throws on an unrecognized STORAGE_DRIVER value", async () => {
    process.env.STORAGE_DRIVER = "dropbox";
    const { getStorageDriver } = await import("@/lib/storage");
    expect(() => getStorageDriver()).toThrow(/Unknown STORAGE_DRIVER/);
  });
});
