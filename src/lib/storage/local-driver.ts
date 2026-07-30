import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { StorageDriver } from "./types";

// Default driver — writes under public/<key>, served by Next's own static
// file handling. Durable across redeploys via the uploads_data Docker
// volume mounted at public/uploads (docker-compose.yml), not this code.
export class LocalStorageDriver implements StorageDriver {
  async put(buffer: Buffer, key: string, _contentType: string): Promise<string> {
    const fullPath = path.join(process.cwd(), "public", key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    return `/${key.split(path.sep).join("/")}`;
  }

  async deleteByUrl(url: string): Promise<void> {
    const fullPath = path.join(process.cwd(), "public", url);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  }
}
