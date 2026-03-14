import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'

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

/**
 * Get upload directory path for current year/month
 */
export function getUploadPath(folder: string = 'general'): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  
  return path.join(process.cwd(), 'public', 'uploads', String(year), month, folder)
}

/**
 * Get relative URL path for uploaded image
 */
export function getImageUrl(filePath: string): string {
  // Remove 'public' from path to get URL
  return filePath.replace(/^.*public/, '')
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
 * Upload and process image
 */
export async function uploadImage(
  file: File,
  options: ImageUploadOptions = {}
): Promise<UploadedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Validate image
  await validateImage(file, opts)

  // Generate unique filename
  const ext = path.extname(file.name)
  const storedFilename = `${uuidv4()}${ext}`
  
  // Get upload directory
  const uploadDir = getUploadPath(opts.folder!)
  const originalDir = path.join(uploadDir, 'original')
  
  // Create directories if they don't exist
  if (!existsSync(originalDir)) {
    await mkdir(originalDir, { recursive: true })
  }

  // Convert File to Buffer
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Get image metadata
  const metadata = await sharp(buffer).metadata()
  
  // Save original image
  const originalPath = path.join(originalDir, storedFilename)
  await writeFile(originalPath, buffer)

  const result: UploadedImage = {
    id: uuidv4(),
    filename: file.name,
    storedFilename,
    filePath: getImageUrl(originalPath),
    fileSize: file.size,
    mimeType: file.type,
    width: metadata.width,
    height: metadata.height,
  }

  // Generate thumbnail
  if (opts.generateThumbnail) {
    const thumbnailDir = path.join(uploadDir, 'thumbnail')
    if (!existsSync(thumbnailDir)) {
      await mkdir(thumbnailDir, { recursive: true })
    }

    const thumbnailPath = path.join(thumbnailDir, storedFilename)
    await sharp(buffer)
      .resize(opts.thumbnailSize, opts.thumbnailSize, {
        fit: 'cover',
        position: 'center',
      })
      .toFile(thumbnailPath)

    result.thumbnailPath = getImageUrl(thumbnailPath)
  }

  // Generate medium size
  if (opts.generateMedium) {
    const mediumDir = path.join(uploadDir, 'medium')
    if (!existsSync(mediumDir)) {
      await mkdir(mediumDir, { recursive: true })
    }

    const mediumPath = path.join(mediumDir, storedFilename)
    await sharp(buffer)
      .resize(opts.mediumSize, opts.mediumSize, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFile(mediumPath)

    result.mediumPath = getImageUrl(mediumPath)
  }

  return result
}

/**
 * Delete image files
 */
export async function deleteImage(filePath: string): Promise<void> {
  try {
    // Delete original
    const fullPath = path.join(process.cwd(), 'public', filePath)
    if (existsSync(fullPath)) {
      await unlink(fullPath)
    }

    // Delete thumbnail
    const thumbnailPath = fullPath.replace('/original/', '/thumbnail/')
    if (existsSync(thumbnailPath)) {
      await unlink(thumbnailPath)
    }

    // Delete medium
    const mediumPath = fullPath.replace('/original/', '/medium/')
    if (existsSync(mediumPath)) {
      await unlink(mediumPath)
    }
  } catch (error) {
    console.error('Error deleting image:', error)
    throw new ImageUploadError('Failed to delete image files', 'DELETE_FAILED')
  }
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
  filePath: string
): Promise<{ width: number; height: number }> {
  const fullPath = path.join(process.cwd(), 'public', filePath)
  const metadata = await sharp(fullPath).metadata()
  
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  }
}
