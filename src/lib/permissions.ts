import { NextResponse } from "next/server";
import type { Session } from "next-auth";

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
