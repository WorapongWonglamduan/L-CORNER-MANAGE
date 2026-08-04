import { prisma } from "@/lib/prisma";

/**
 * Media.entity_type/entity_id is a polymorphic pointer (no real FK), so
 * ownership can't be checked via a Prisma relation filter — this resolves
 * it back to the owning row's shop_id by hand. Only "product" is ever
 * actually used today (see prisma/seed.ts) — any other/unknown entity_type
 * falls through to the `uploaded_by` fallback below.
 *
 * A freshly-uploaded image with no entity_type/entity_id yet (uploaded
 * before the product it'll attach to exists) has nothing to resolve
 * through — falls back to the uploader's own shop, so a caller can still
 * manage their own not-yet-attached uploads.
 */
export async function resolveMediaShopId(media: {
  entity_type: string | null;
  entity_id: string | null;
  uploaded_by: string | null;
}): Promise<string | null> {
  if (media.entity_type === "product" && media.entity_id) {
    const product = await prisma.product.findUnique({
      where: { id: media.entity_id },
      select: { shop_id: true },
    });
    if (product) return product.shop_id;
  }

  // A shop's logo — entity_id IS the shop's own id, not a foreign key to
  // look up through another table.
  if (media.entity_type === "shop" && media.entity_id) {
    return media.entity_id;
  }

  if (media.uploaded_by) {
    const uploader = await prisma.user.findUnique({
      where: { id: media.uploaded_by },
      select: { shop_id: true },
    });
    return uploader?.shop_id ?? null;
  }

  return null;
}
