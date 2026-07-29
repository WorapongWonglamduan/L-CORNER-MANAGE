/**
 * Canonical permission strings, matching prisma/seed.ts.
 * Format: "<resource>.<action>".
 * Used to validate `Role.permissions` and to render the permission
 * checkbox list in the Roles admin UI.
 */
export const ALL_PERMISSIONS = [
  "users.view",
  "users.create",
  "users.update",
  "users.delete",
  "products.view",
  "products.create",
  "products.update",
  "products.delete",
  "inventory.view",
  "inventory.adjust",
  "inventory.transfer",
  "sales.view",
  "sales.create",
  "sales.void",
  "sales.refund",
  "reports.view",
  "settings.view",
  "settings.update",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];
