# Stock Management (as implemented)

> This replaces five planning-era docs (`STOCK_DEDUCTION.md`, `STOCK_MANAGEMENT_GUIDE.md`, `STOCK_MANAGEMENT_IMPLEMENTATION.md`, `STOCK_NAVIGATION_GUIDE.md`, `STOCK_TRANSACTION_DESIGN.md`) that described a `stock_transactions`/`StockAdjustment` design which was never built. The actual implementation consolidated everything into a single **`StockMovement`** model. Those originals are kept for historical context at `docs/archive/` but do not describe the current system — this doc does. Verified against `prisma/schema.prisma` and the actual route handlers as of this writing.

## Data model

Stock lives directly on `Product`, with a full audit log in `StockMovement`.

```prisma
model Product {
  // ...
  current_stock       Decimal @default(0) @db.Decimal(15, 4)
  min_stock_level     Decimal @default(0) @db.Decimal(15, 4)
  low_stock_threshold Decimal @default(0) @db.Decimal(15, 4)
  track_stock         Boolean @default(true)
}

model StockMovement {
  id                String   @id @default(uuid())
  product_id        String

  movement_type     String   // "manual_adjustment", "sale", "purchase", "production", "transfer", "return", "damage", "expired", "count"
  direction         String   // "in" | "out"

  quantity_before   Decimal  @db.Decimal(15, 4)
  quantity_change   Decimal  @db.Decimal(15, 4) // always positive; direction gives the sign
  quantity_after    Decimal  @db.Decimal(15, 4)

  reference_type    String?  // "sale", "purchase_order", "production", "transfer", ...
  reference_id      String?

  reason_code       String?
  reason_text       String
  note              String?  @db.Text

  created_by        String   // plain string, NOT a relation to User — no referential integrity
  created_at        DateTime @default(now())
  transaction_date  DateTime @default(now())

  @@index([product_id])
  @@index([movement_type])
  @@index([transaction_date])
  @@index([reference_type, reference_id])
  @@map("stock_movements")
}
```

Product types (`src/constants/inventory.ts`, `PRODUCTS_TYPES`): `PRODUCT`, `SEMI_FINISHED`, `CONTAINER`, `FINISHED_GOOD`, `INGREDIENT`. Note this enum is **duplicated** in `src/constants/input-types.ts` under the same name — both are imported in different places across the codebase, which risks drift if only one copy is edited (see code-structure review notes for the cleanup item).

## API surface (what actually exists)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/inventory/adjust` | POST | Create a `manual_adjustment` `StockMovement` and update `Product.current_stock`, inside a single Prisma transaction |
| `/api/inventory/movements` | GET | Paginated, filterable movement history (`product_id`, `movement_type`, `direction`, date range) |

`adjustment_type` in the adjust request body accepts `"in"`, `"out"`, or `"adjustment"` (direct count-correction — sets stock to an absolute value rather than +/-). The handler computes `direction` and `quantity_change` from that, validates the resulting stock isn't negative, then writes the `StockMovement` row and updates `Product.current_stock` together in `prisma.$transaction(...)`.

### ⚠️ Known gap: `/api/inventory/low-stock` does not exist

`src/components/ui/low-stock-alert.tsx` fetches `GET /api/inventory/low-stock` on mount and every 5 minutes, but **no route file for it exists** under `src/app/api/inventory/`. The fetch fails, `!response.ok` returns early, and the widget silently never shows anything — it currently renders nothing in the app regardless of actual stock levels. Either implement this endpoint or repoint the component at an existing data source (e.g. the low-stock count already computed in `/api/dashboard/stats`) if this feature is meant to be live.

## UI

- `src/app/[locale]/inventory/page.tsx` → `src/components/pages/inventory/` (`index.tsx` + `helper.tsx`) — the inventory list page
- `src/components/pages/inventory/stock-adjustment-modal.tsx` — the modal actually wired up and imported by the inventory page
- `src/components/ui/low-stock-alert.tsx` — floating low-stock popup (see gap above)
- `src/components/ui/pagination.tsx` — generic pagination, used here and elsewhere

Note: `src/components/ui/stock-adjustment-modal.tsx` (a second, unrelated 334-line file with the same name) also exists but has zero importers anywhere in `src/` — it's dead code left over from an earlier iteration and is a candidate for deletion.

## Automatic deduction on sale

Stock deduction on `POST /api/sales` branches on `product_type`:

- **`FINISHED_GOOD`**: deduct `current_stock` on the product itself.
- **`SEMI_FINISHED`**: don't touch the product's own stock; deduct each ingredient in its active `Recipe` (via `RecipeIngredient`) instead.
- **`INGREDIENT`** (raw material sold directly): deduct `current_stock` on the product itself, same as finished goods.

Cancelling a sale (`DELETE /api/sales/{id}`) reverses the same logic to restore stock. Every deduction/restoration should be reflected as a `StockMovement` row with `movement_type: "sale"` and `reference_type: "sale"` / `reference_id: <sale id>` — confirm this is wired end-to-end in `src/app/api/sales/route.ts` if you're relying on the movement log for a full audit trail, since the two features (sales deduction, movement logging) were originally designed independently (see the archived stock docs).

## What's not built

From the original planning docs, these remain unimplemented:
- `/api/inventory/low-stock` endpoint (see gap above)
- A dedicated stock-history UI page (movement data is queryable via `/api/inventory/movements` but there's no page rendering it)
- Stock transfer between warehouses, barcode scanning, batch/lot tracking, expiry tracking — all were listed as "optional/future" and none exist in the schema
