import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Attaching media mutates the product's image set, same as any other
    // product-update — every sibling product-mutation route requires
    // products.update, not just a valid session.
    const session = await auth()
    const denied = requirePermission(session, 'products.update')
    if (denied) return denied

    const { id: productId } = await params
    const body = await request.json()
    const { media_id, is_primary, sort_order } = body

    if (!media_id) {
      return NextResponse.json(
        { error: 'media_id is required' },
        { status: 400 }
      )
    }

    // Check if product exists and belongs to the caller's shop
    const product = await prisma.product.findFirst({
      where: { id: productId, shop_id: session!.user.shop_id! },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if media exists
    const media = await prisma.media.findUnique({
      where: { id: media_id },
    })

    if (!media) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      )
    }

    // If setting as primary, unset other primary images
    if (is_primary) {
      await prisma.productMedia.updateMany({
        where: {
          product_id: productId,
          is_primary: true,
        },
        data: {
          is_primary: false,
        },
      })
    }

    // Create product media relation
    const productMedia = await prisma.productMedia.create({
      data: {
        product_id: productId,
        media_id,
        is_primary: is_primary || false,
        sort_order: sort_order || 0,
      },
      include: {
        media: true,
      },
    })

    return NextResponse.json(productMedia)
  } catch (error) {
    console.error('Attach media error:', error)
    return NextResponse.json(
      { error: 'Failed to attach media to product' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const denied = requirePermission(session, 'products.view')
    if (denied) return denied

    const { id: productId } = await params

    // Verify the product belongs to the caller's shop before listing its media.
    const product = await prisma.product.findFirst({
      where: { id: productId, shop_id: session!.user.shop_id! },
      select: { id: true },
    })
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const productMedia = await prisma.productMedia.findMany({
      where: { product_id: productId },
      include: { media: true },
      orderBy: { sort_order: 'asc' },
    })

    return NextResponse.json(productMedia)
  } catch (error) {
    console.error('Get product media error:', error)
    return NextResponse.json(
      { error: 'Failed to get product media' },
      { status: 500 }
    )
  }
}
