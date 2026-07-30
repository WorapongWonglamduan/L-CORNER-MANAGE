/** Every GET list endpoint reads `pageSize` straight from a query param
 * with no upper bound — a client requesting `pageSize=999999999` forces
 * Prisma to materialize (or, for endpoints that fetch-then-slice, to fully
 * fetch) an unbounded result set on every request. Clamps to a sane
 * maximum so pagination stays pagination. */
const MAX_PAGE_SIZE = 100;

export function parsePageSize(
  searchParams: URLSearchParams,
  defaultSize = 10,
): number {
  const raw = parseInt(searchParams.get("pageSize") || String(defaultSize));
  if (!Number.isFinite(raw) || raw < 1) return defaultSize;
  return Math.min(raw, MAX_PAGE_SIZE);
}
