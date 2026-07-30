import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { StorageDriver } from "./types";

// Cloudflare R2 — S3-API-compatible, so the standard AWS SDK works against
// it directly (per Cloudflare's own docs). `region` must be a non-empty
// string for the SDK, but R2 ignores its value entirely — "auto" is
// Cloudflare's own documented placeholder.
//
// Serves images via a public bucket + custom domain (R2_PUBLIC_BASE_URL),
// not presigned URLs — product photos are public-facing content, and
// Cloudflare's own docs flag the free *.r2.dev domain as rate-limited and
// "not for production", so R2_PUBLIC_BASE_URL is expected to be a real
// custom domain once one's configured.
export class R2StorageDriver implements StorageDriver {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor() {
    const accountId = requireEnv("R2_ACCOUNT_ID");
    const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
    const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
    this.bucket = requireEnv("R2_BUCKET_NAME");
    this.publicBaseUrl = requireEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async put(buffer: Buffer, key: string, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return `${this.publicBaseUrl}/${key}`;
  }

  async deleteByUrl(url: string): Promise<void> {
    if (!url.startsWith(this.publicBaseUrl)) {
      // Not one of ours (e.g. a leftover local-disk path from before a
      // STORAGE_DRIVER switch) — nothing this driver can delete.
      return;
    }
    const key = url.slice(this.publicBaseUrl.length + 1);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required when STORAGE_DRIVER=r2`);
  }
  return value;
}
