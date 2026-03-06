# Database Migration Instructions

## Changes Made

### 1. Removed VAT/Tax from System
- Changed `tax_rate` default from 7 to 0 in Sale model
- Removed tax display from UI components
- Updated POS to send tax_rate: 0

### 2. Removed Unused Tables
The following tables have been removed from the schema:

#### Completely Removed:
- `Language` - Not used in the system
- `UnitConversion` - No unit conversion needed
- `Stock` - Using `Product.current_stock` instead
- `StockTransaction` - No transaction history needed
- `StockAlert` - No stock alert system
- `Topping` - No topping/add-ons system
- `ProductTopping` - Related to toppings
- `SaleItemTopping` - Related to toppings
- `Customer` - Using walk-in sales only (customer_id is nullable in Sale)
- `Supplier` - No purchase order system
- `PurchaseOrder` - No purchase order system
- `PurchaseOrderItem` - No purchase order system

#### Relations Removed from Existing Tables:
- `User`: Removed `created_purchase_orders`, `stock_transactions`
- `Unit`: Removed `toppings`, `from_conversions`, `to_conversions`, `stock_transactions`
- `Category`: Removed `toppings`
- `Warehouse`: Removed `stocks`, `stock_transactions`, `stock_alerts`, `purchase_orders`
- `Product`: Removed `product_toppings`, `toppings_as_ingredient`, `stocks`, `stock_transactions`, `stock_alerts`, `purchase_order_items`, `sale_item_toppings`
- `ProductUnit`: Removed `purchase_order_items`
- `Sale`: Removed `customer` relation (customer_id still exists but nullable)

## How to Apply Migration

### Option 1: Using Prisma Migrate (Recommended for Development)
```bash
# Generate and apply migration
npx prisma migrate dev --name remove_unused_tables_and_vat

# This will:
# 1. Create a new migration file
# 2. Apply it to your database
# 3. Regenerate Prisma Client
```

### Option 2: Using Prisma DB Push (Quick for Development)
```bash
# Push schema changes directly to database
npx prisma db push

# Regenerate Prisma Client
npx prisma generate
```

### Option 3: Manual Migration (Production)
```bash
# Create migration without applying
npx prisma migrate dev --create-only --name remove_unused_tables_and_vat

# Review the generated SQL in prisma/migrations/
# Then apply when ready:
npx prisma migrate deploy
```

## Important Notes

### Before Running Migration:
1. **BACKUP YOUR DATABASE** - This will drop multiple tables
2. Make sure no code is still using the removed tables
3. Test in development environment first

### After Running Migration:
1. Verify all tables were dropped successfully
2. Check that existing sales data is intact
3. Test POS functionality
4. Test sales listing page

### If You Need to Rollback:
If you need to restore the removed tables, you'll need to:
1. Restore from backup, or
2. Manually recreate the tables using previous schema version

## Verification Queries

After migration, run these queries to verify:

```sql
-- Check that unused tables are gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'languages', 'unit_conversions', 'stocks', 'stock_transactions', 
  'stock_alerts', 'toppings', 'product_toppings', 'sale_item_toppings',
  'customers', 'suppliers', 'purchase_orders', 'purchase_order_items'
);
-- Should return 0 rows

-- Check that sales table still exists and has data
SELECT COUNT(*) FROM sales;

-- Check tax_rate default is 0
SELECT column_default 
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name = 'tax_rate';
-- Should show '0'
```

## What's Kept

### Core Tables (Still in Use):
- `users`, `roles`, `user_roles` - Authentication & Authorization
- `units` - Unit of measurement
- `categories` - Product categories
- `warehouses` - Warehouse management
- `products` - Product catalog
- `product_units` - Product unit variations
- `product_types` - Product type classification
- `recipes` - Recipe for semi-finished products
- `recipe_ingredients` - Recipe ingredients
- `sales` - Sales orders
- `sale_items` - Sale line items

### Why These Tables Are Kept:
- **Essential for POS**: Sales, Products, Units
- **Recipe System**: For semi-finished products that need ingredient tracking
- **Multi-unit Support**: For products sold in different units
- **User Management**: Authentication and authorization
