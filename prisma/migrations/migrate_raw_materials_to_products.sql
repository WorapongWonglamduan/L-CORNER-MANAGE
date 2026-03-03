-- Migration: Merge RawMaterial into Product
-- This script migrates existing raw_materials data into products table

-- Step 1: Add new columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS current_stock DECIMAL(15,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,2);

-- Step 2: Migrate existing raw_materials to products
INSERT INTO products (
  id, code, name_i18n, description_i18n, 
  product_type_id, base_unit_id, 
  cost_price, min_stock_level, current_stock,
  is_active, track_stock, has_serial, has_expiry,
  created_at, updated_at
)
SELECT 
  rm.id, rm.code, rm.name_i18n, rm.description_i18n,
  rm.type_id, rm.unit_id,
  rm.cost_price, rm.min_stock, rm.current_stock,
  rm.is_active, true, false, false,
  rm.created_at, rm.updated_at
FROM raw_materials rm
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = rm.id);

-- Step 3: Update recipe_ingredients to use ingredient_id instead of raw_material_id
-- (This assumes the column already exists in the schema)

-- Step 4: Drop raw_materials table (after confirming data migration)
-- DROP TABLE IF EXISTS raw_materials;

-- Note: Run this migration carefully and backup your database first!
