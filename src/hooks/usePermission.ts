"use client";

import { useSession } from "next-auth/react";

/**
 * Client-side permission check, mirroring src/lib/permissions.ts on the server.
 * Permission string convention: "<resource>.<action>" (see prisma/seed.ts).
 */
export function usePermission(permission: string): boolean {
  const { data: session } = useSession();
  return !!session?.user?.permissions?.includes(permission);
}

export function useHasAnyPermission(permissions: string[]): boolean {
  const { data: session } = useSession();
  const userPermissions = session?.user?.permissions ?? [];
  return permissions.some((permission) => userPermissions.includes(permission));
}

export function useRoles(): string[] {
  const { data: session } = useSession();
  return session?.user?.roles ?? [];
}
