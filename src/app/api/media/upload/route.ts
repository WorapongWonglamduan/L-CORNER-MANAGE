import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { requirePermission } from '@/lib/permissions'
import { uploadImage, ImageUploadError } from '@/lib/image-upload'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    const denied = requirePermission(session, 'products.create')
    if (denied) return denied

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const entityType = formData.get('entity_type') as string | null
    const entityId = formData.get('entity_id') as string | null
    const folder = (formData.get('folder') as string) || 'general'
    const altText = formData.get('alt_text') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Upload and process image
    const uploadedImage = await uploadImage(file, {
      folder,
      generateThumbnail: true,
      generateMedium: true,
    })

    // Save to database
    const media = await prisma.media.create({
      data: {
        filename: uploadedImage.filename,
        stored_filename: uploadedImage.storedFilename,
        file_path: uploadedImage.filePath,
        file_size: uploadedImage.fileSize,
        mime_type: uploadedImage.mimeType,
        width: uploadedImage.width,
        height: uploadedImage.height,
        thumbnail_path: uploadedImage.thumbnailPath,
        medium_path: uploadedImage.mediumPath,
        entity_type: entityType,
        entity_id: entityId,
        folder,
        alt_text: altText,
        uploaded_by: session?.user?.id,
      },
    })

    return NextResponse.json({
      id: media.id,
      file_path: media.file_path,
      thumbnail_path: media.thumbnail_path,
      medium_path: media.medium_path,
      url: media.file_path,
      width: media.width,
      height: media.height,
    })
  } catch (error) {
    console.error('Upload error:', error)

    if (error instanceof ImageUploadError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
