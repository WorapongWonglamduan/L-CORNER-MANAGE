// Minimal storage abstraction — just enough to swap where uploaded product
// images physically live (local disk vs. Cloudflare R2) without the
// sharp-resize logic in image-upload.ts needing to know which one is
// active. `key` is a storage-relative path with no leading slash and no
// `public`/bucket prefix (e.g. "uploads/2026/07/general/original/<uuid>.jpg")
// — every driver is expected to derive its own storage location and public
// URL from that same key shape.
export interface StorageDriver {
  /** Saves `buffer` under `key` and returns the URL the app should store
   *  in the database and serve to the browser. */
  put(buffer: Buffer, key: string, contentType: string): Promise<string>;

  /** Deletes whatever `put()` previously created for this URL. Takes the
   *  stored URL (not a key) since that's what's actually saved in the
   *  Media rows — each driver knows how to turn its own URL shape back
   *  into whatever it needs internally (a filesystem path here, an R2
   *  object key there). Must not throw if the object is already gone. */
  deleteByUrl(url: string): Promise<void>;
}
