import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import { getStorageDriver } from '@/lib/storage'

export interface UploadedImage {
  id: string
  filename: string
  storedFilename: string
  filePath: string
  fileSize: number
  mimeType: string
  width?: number
  height?: number
}

export interface ImageUploadOptions {
  folder?: string
  maxSize?: number // in bytes
}

const DEFAULT_OPTIONS: ImageUploadOptions = {
  folder: 'general',
  maxSize: 5 * 1024 * 1024, // 5MB
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]

export class ImageUploadError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'ImageUploadError'
  }
}

// `folder` comes straight from client-supplied form data (see
// media/upload/route.ts) and is joined into a storage key below — without
// this allow-list, a value like `../../../../etc` could let any
// authenticated products.create holder write files outside the intended
// uploads tree (a real path-traversal risk on the local driver; R2 keys
// aren't filesystem paths, but there's no reason to trust the input more
// there either).
const SAFE_FOLDER = /^[a-zA-Z0-9_-]+$/

function sanitizeFolder(folder: string): string {
  return SAFE_FOLDER.test(folder) ? folder : 'general'
}

// The original filename is preserved (not replaced by a generated UUID) so
// it stays human-readable in the bucket/disk — but it's client-supplied,
// so the same path-traversal concern as `folder` applies once it's used
// directly as a storage key segment: strip any directory components first
// (defends against a crafted "../../etc/passwd"-style name), then replace
// anything that isn't a safe filename character. Collision-safety comes
// from the UUID folder each upload gets (see uploadImage), not from this.
// Allows letters/digits/Thai script, spaces, and the punctuation that
// shows up in ordinary real-world filenames (Windows' own "photo (1).jpg"
// duplicate-download pattern, "product_shot-final.jpg", etc.) — anything
// else (path separators, control characters, quotes, ...) is replaced.
const SAFE_FILENAME_CHARS = new RegExp(`[^a-zA-Z0-9._\\-() \\u0E00-\\u0E7F]`, 'g')

function sanitizeFilename(name: string): string {
  const lastSegment = name.split(/[\\/]/).pop() || 'file'
  return lastSegment.replace(SAFE_FILENAME_CHARS, '_') || 'file'
}

/**
 * Storage key prefix for the current year/month, e.g.
 * "uploads/2026/07/general" — shared by both storage drivers, which each
 * append "/<uuid>/<original-filename>" to it.
 */
export function getUploadKeyPrefix(folder: string = 'general'): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  return `uploads/${year}/${month}/${sanitizeFolder(folder)}`
}

/**
 * Validate image file
 */
export async function validateImage(
  file: File,
  options: ImageUploadOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Check file size
  if (file.size > opts.maxSize!) {
    throw new ImageUploadError(
      `File size exceeds maximum allowed size of ${opts.maxSize! / 1024 / 1024}MB`,
      'FILE_TOO_LARGE'
    )
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new ImageUploadError(
      `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      'INVALID_FILE_TYPE'
    )
  }
}

/**
 * Upload and process image — saves the original file as-is (no
 * thumbnail/medium resizing: nothing in the app ever read those, only the
 * original was ever displayed anywhere, so generating them was pure
 * wasted work and storage) through the active StorageDriver (local disk
 * by default, or Cloudflare R2 when STORAGE_DRIVER=r2). Stores it under a
 * per-upload UUID folder with its original filename kept intact, e.g.
 * "uploads/2026/07/general/<uuid>/<original-filename>.jpg" — the UUID
 * folder guarantees no collision between two uploads sharing the same
 * filename, without needing to rename the file itself.
 */
export async function uploadImage(
  file: File,
  options: ImageUploadOptions = {}
): Promise<UploadedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Validate image
  await validateImage(file, opts)

  const driver = getStorageDriver()
  const keyPrefix = getUploadKeyPrefix(opts.folder!)
  const uploadId = uuidv4()
  const storedFilename = sanitizeFilename(file.name)

  // Convert File to Buffer
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Get image metadata
  const metadata = await sharp(buffer).metadata()

  const url = await driver.put(buffer, `${keyPrefix}/${uploadId}/${storedFilename}`, file.type)

  return {
    id: uuidv4(),
    filename: file.name,
    storedFilename,
    filePath: url,
    fileSize: file.size,
    mimeType: file.type,
    width: metadata.width,
    height: metadata.height,
  }
}

/**
 * Delete image files — takes the exact URL a Media row has stored.
 * thumbnailPath/mediumPath are accepted for backward compatibility with
 * rows uploaded before this file dropped thumbnail/medium generation
 * (their files may still exist and need cleaning up); new uploads never
 * set them.
 */
export async function deleteImage(
  filePath: string,
  thumbnailPath?: string | null,
  mediumPath?: string | null,
): Promise<void> {
  const driver = getStorageDriver()
  try {
    await driver.deleteByUrl(filePath)
    if (thumbnailPath) await driver.deleteByUrl(thumbnailPath)
    if (mediumPath) await driver.deleteByUrl(mediumPath)
  } catch (error) {
    console.error('Error deleting image:', error)
    throw new ImageUploadError('Failed to delete image files', 'DELETE_FAILED')
  }
}
