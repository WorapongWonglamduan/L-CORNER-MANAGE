import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

/**
 * Permission string convention: "<resource>.<action>", matching prisma/seed.ts
 * (e.g. "products.delete", "inventory.adjust", "sales.void", "settings.update").
 */
export function hasPermission(
  session: Session | null,
  permission: string,
): boolean {
  return !!session?.user?.permissions?.includes(permission);
}

export function hasAnyPermission(
  session: Session | null,
  permissions: string[],
): boolean {
  return permissions.some((permission) => hasPermission(session, permission));
}

/**
 * Route-guard helper: call at the top of an API handler right after `auth()`.
 * Returns a NextResponse to return immediately if access should be denied,
 * or `null` if the caller should proceed.
 */
export function requirePermission(
  session: Session | null,
  permission: string,
): NextResponse | null {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, permission)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * Platform-level gate for the super-admin shop-provisioning routes/pages —
 * orthogonal to the per-shop `permissions` array (a super admin has no
 * shop_id and no shop-scoped Role, so it can't be expressed as a permission
 * string).
 */
export function requireSuperAdmin(session: Session | null): NextResponse | null {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.is_super_admin) {
    return NextResponse.json(
      { error: "Forbidden: super admin only" },
      { status: 403 },
    );
  }
  return null;
}

/**
 * shop_id is a 1:1 attribute of the user row (unlike the many-to-many
 * UserWarehouse grant), so there's no separate live-DB variant needed here
 * the way assertWarehouseAccessLive exists for warehouses below — the JWT
 * claim and a fresh DB read would say the same thing.
 */
export function hasShopAccess(
  session: Session | null,
  shopId: string,
): boolean {
  return !!session?.user?.is_super_admin || session?.user?.shop_id === shopId;
}

export function requireShopAccess(
  session: Session | null,
  shopId: string,
): NextResponse | null {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasShopAccess(session, shopId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * JWT-claim based (same staleness trade-off already accepted for
 * permissions/roles — the assigned-branch list is baked in at login and
 * only refreshes on next login). Use on read (GET) routes, where a stale
 * grant/revoke means "sees slightly outdated authorized data" at worst.
 */
export function hasWarehouseAccess(
  session: Session | null,
  warehouseId: string,
): boolean {
  return !!session?.user?.warehouse_ids?.includes(warehouseId);
}

export function requireWarehouseAccess(
  session: Session | null,
  warehouseId: string,
): NextResponse | null {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasWarehouseAccess(session, warehouseId)) {
    return NextResponse.json(
      { error: "Forbidden: no access to this warehouse" },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Live DB check (not JWT-claim based) — use on mutating routes (creating a
 * sale, adjusting/transferring stock, production), where a user who was just
 * revoked access should not be able to keep writing to that branch until
 * their JWT naturally rotates. Deliberately async and separate from
 * `requireWarehouseAccess` so the two are never accidentally interchanged.
 */
export async function assertWarehouseAccessLive(
  session: Session | null,
  warehouseId: string,
): Promise<NextResponse | null> {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const count = await prisma.userWarehouse.count({
    where: { user_id: session.user.id, warehouse_id: warehouseId },
  });
  if (count === 0) {
    return NextResponse.json(
      { error: "Forbidden: no access to this warehouse" },
      { status: 403 },
    );
  }
  return null;
}
