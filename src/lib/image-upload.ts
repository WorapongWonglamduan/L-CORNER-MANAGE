import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import { getStorageDriver } from '@/lib/storage'

export interface UploadedImage {
  id: string
  filename: string
  storedFilename: string
  filePath: string
  thumbnailPath?: string
  mediumPath?: string
  fileSize: number
  mimeType: string
  width?: number
  height?: number
}

export interface ImageUploadOptions {
  folder?: string
  maxSize?: number // in bytes
  generateThumbnail?: boolean
  generateMedium?: boolean
  thumbnailSize?: number
  mediumSize?: number
}

const DEFAULT_OPTIONS: ImageUploadOptions = {
  folder: 'general',
  maxSize: 5 * 1024 * 1024, // 5MB
  generateThumbnail: true,
  generateMedium: true,
  thumbnailSize: 200,
  mediumSize: 800,
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

/**
 * Storage key prefix for the current year/month, e.g.
 * "uploads/2026/07/general" — shared by both storage drivers, which each
 * append "/original|thumbnail|medium/<uuid>.<ext>" to it.
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
 * Upload and process image — resizes via sharp into up to 3 variants and
 * saves each through the active StorageDriver (local disk by default, or
 * Cloudflare R2 when STORAGE_DRIVER=r2). Resize logic here never touches
 * the filesystem/network directly; only the driver does.
 */
export async function uploadImage(
  file: File,
  options: ImageUploadOptions = {}
): Promise<UploadedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Validate image
  await validateImage(file, opts)

  const driver = getStorageDriver()

  // Generate unique filename
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
  const storedFilename = `${uuidv4()}${ext}`
  const keyPrefix = getUploadKeyPrefix(opts.folder!)

  // Convert File to Buffer
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Get image metadata
  const metadata = await sharp(buffer).metadata()

  // Save original image
  const originalUrl = await driver.put(buffer, `${keyPrefix}/original/${storedFilename}`, file.type)

  const result: UploadedImage = {
    id: uuidv4(),
    filename: file.name,
    storedFilename,
    filePath: originalUrl,
    fileSize: file.size,
    mimeType: file.type,
    width: metadata.width,
    height: metadata.height,
  }

  // Generate thumbnail
  if (opts.generateThumbnail) {
    const thumbnailBuffer = await sharp(buffer)
      .resize(opts.thumbnailSize, opts.thumbnailSize, {
        fit: 'cover',
        position: 'center',
      })
      .toBuffer()
    result.thumbnailPath = await driver.put(
      thumbnailBuffer,
      `${keyPrefix}/thumbnail/${storedFilename}`,
      file.type,
    )
  }

  // Generate medium size
  if (opts.generateMedium) {
    const mediumBuffer = await sharp(buffer)
      .resize(opts.mediumSize, opts.mediumSize, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer()
    result.mediumPath = await driver.put(
      mediumBuffer,
      `${keyPrefix}/medium/${storedFilename}`,
      file.type,
    )
  }

  return result
}

/**
 * Delete image files — takes the exact URLs a Media row has stored (not
 * derived by string-replacing "/original/" in filePath, which only ever
 * worked by coincidence of the local driver's own path shape and silently
 * skipped variants for any other storage layout).
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
