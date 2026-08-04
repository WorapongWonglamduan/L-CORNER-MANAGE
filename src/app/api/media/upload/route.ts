import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { requirePermission } from '@/lib/permissions'
import { uploadImage, ImageUploadError } from '@/lib/image-upload'
import { prisma } from '@/lib/prisma'
import { resolveMediaShopId } from '@/lib/media-ownership'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    // A super admin has no shop-scoped Role (and so no products.create
    // permission) but still needs to upload a shop's logo while
    // provisioning/editing it — bypass the permission check for them, same
    // pattern as the entity-ownership check just below.
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.user.is_super_admin) {
      const denied = requirePermission(session, 'products.create')
      if (denied) return denied
    }

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

    // If the upload is being attached to an existing entity, that entity
    // must belong to the caller's shop — otherwise a shop could attach an
    // image to another shop's product by guessing its id.
    if (entityId) {
      const ownerShopId = await resolveMediaShopId({
        entity_type: entityType,
        entity_id: entityId,
        uploaded_by: null,
      })
      if (!session!.user.is_super_admin && ownerShopId !== session!.user.shop_id) {
        return NextResponse.json(
          { error: 'Entity not found' },
          { status: 404 }
        )
      }
    }

    // Upload and process image — single variant only (original), no
    // thumbnail/medium: nothing in the app ever displayed those, only the
    // original was ever read anywhere, so generating them was pure wasted
    // work and storage.
    const uploadedImage = await uploadImage(file, { folder })

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
