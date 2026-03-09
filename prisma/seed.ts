import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function cleanup() {
  console.log("🧹 Cleaning up old data...");
  
  // Delete in correct order to respect foreign key constraints
  await prisma.recipeIngredient.deleteMany({});
  await prisma.recipe.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.productType.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
  
  console.log("✅ Cleanup completed!");
}

async function main() {
  console.log("🌱 Starting seed...");
  
  // Cleanup old data first
  await cleanup();

  // Define permissions
  console.log("🔑 Defining permissions...");
  const allPermissions = [
    "users.view", "users.create", "users.update", "users.delete",
    "products.view", "products.create", "products.update", "products.delete",
    "inventory.view", "inventory.adjust",
    "sales.view", "sales.create", "sales.void",
    "reports.view",
    "settings.view", "settings.update",
  ];

  const managerPermissions = [
    "products.view", "products.create", "products.update", "products.delete",
    "inventory.view", "inventory.adjust",
    "sales.view", "sales.create", "sales.void",
    "reports.view",
  ];

  const cashierPermissions = [
    "inventory.view",
    "sales.view", "sales.create",
    "products.view",
  ];

  // Create Roles with permissions
  console.log("👥 Creating roles...");
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
      display_name_i18n: { th: "ผู้ดูแลระบบ", en: "Administrator" },
      description_i18n: { th: "เข้าถึงทุกฟังก์ชันในระบบ", en: "Full system access" },
      permissions: allPermissions,
      is_system: true,
      is_active: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: "manager" },
    update: {},
    create: {
      name: "manager",
      display_name_i18n: { th: "ผู้จัดการ", en: "Manager" },
      description_i18n: { th: "จัดการสินค้า สต็อก และรายงาน", en: "Manage products, inventory, and reports" },
      permissions: managerPermissions,
      is_system: true,
      is_active: true,
    },
  });

  const cashierRole = await prisma.role.upsert({
    where: { name: "cashier" },
    update: {},
    create: {
      name: "cashier",
      display_name_i18n: { th: "พนักงานขาย", en: "Cashier" },
      description_i18n: { th: "ขายสินค้าและดูสต็อก", en: "Sales and view inventory" },
      permissions: cashierPermissions,
      is_system: true,
      is_active: true,
    },
  });

  // Create admin user
  console.log("👤 Creating admin user...");
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@lcorner.local",
      password: hashedPassword,
      full_name: "ผู้ดูแลระบบ",
      is_active: true,
    },
  });

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: {
      user_id_role_id: {
        user_id: adminUser.id,
        role_id: adminRole.id,
      },
    },
    update: {},
    create: {
      user_id: adminUser.id,
      role_id: adminRole.id,
    },
  });

  console.log("📏 Creating units...");
  const unitPiece = await prisma.unit.upsert({
    where: { id: "unit-piece" },
    update: {},
    create: {
      id: "unit-piece",
      name_i18n: { th: "ชิ้น", en: "Piece" },
      abbreviation_i18n: { th: "ชิ้น", en: "pcs" },
      unit_type: "quantity",
      is_base_unit: true,
      is_active: true,
    },
  });

  const unitGram = await prisma.unit.upsert({
    where: { id: "unit-gram" },
    update: {},
    create: {
      id: "unit-gram",
      name_i18n: { th: "กรัม", en: "Gram" },
      abbreviation_i18n: { th: "ก.", en: "g" },
      unit_type: "weight",
      is_base_unit: true,
      is_active: true,
    },
  });

  const unitMl = await prisma.unit.upsert({
    where: { id: "unit-ml" },
    update: {},
    create: {
      id: "unit-ml",
      name_i18n: { th: "มิลลิลิตร", en: "Milliliter" },
      abbreviation_i18n: { th: "มล.", en: "ml" },
      unit_type: "volume",
      is_base_unit: true,
      is_active: true,
    },
  });

  const unitCup = await prisma.unit.upsert({
    where: { id: "unit-cup" },
    update: {},
    create: {
      id: "unit-cup",
      name_i18n: { th: "แก้ว", en: "Cup" },
      abbreviation_i18n: { th: "แก้ว", en: "cup" },
      unit_type: "quantity",
      is_base_unit: false,
      is_active: true,
    },
  });

  console.log("📂 Creating categories...");
  const catBeverage = await prisma.category.upsert({
    where: { id: "cat-beverage" },
    update: {},
    create: {
      id: "cat-beverage",
      name_i18n: { th: "เครื่องดื่ม", en: "Beverages" },
      sort_order: 1,
      is_active: true,
    },
  });

  const catCoffee = await prisma.category.upsert({
    where: { id: "cat-coffee" },
    update: {},
    create: {
      id: "cat-coffee",
      name_i18n: { th: "กาแฟ", en: "Coffee" },
      parent_id: catBeverage.id,
      sort_order: 1,
      is_active: true,
    },
  });

  const catTea = await prisma.category.upsert({
    where: { id: "cat-tea" },
    update: {},
    create: {
      id: "cat-tea",
      name_i18n: { th: "ชา", en: "Tea" },
      parent_id: catBeverage.id,
      sort_order: 2,
      is_active: true,
    },
  });

  console.log("🏷️ Creating product types...");
  const productTypeIngredient = await prisma.productType.upsert({
    where: { code: "INGREDIENT" },
    update: {},
    create: {
      code: "INGREDIENT",
      name_i18n: { th: "วัตถุดิบ", en: "Ingredient" },
      icon: "package",
      type: "ingredient",
      sort_order: 1,
      is_active: true,
    },
  });

  const productTypeSemiFinished = await prisma.productType.upsert({
    where: { code: "SEMI_FINISHED" },
    update: {},
    create: {
      code: "SEMI_FINISHED",
      name_i18n: { th: "กึ่งสำเร็จรูป", en: "Semi-Finished" },
      icon: "box",
      type: "semi_finished",
      sort_order: 2,
      is_active: true,
    },
  });

  const productTypeFinishedGood = await prisma.productType.upsert({
    where: { code: "FINISHED_GOOD" },
    update: {},
    create: {
      code: "FINISHED_GOOD",
      name_i18n: { th: "สินค้าสำเร็จรูป", en: "Finished Good" },
      icon: "check-circle",
      type: "finished_good",
      sort_order: 3,
      is_active: true,
    },
  });

  const productTypeContainer = await prisma.productType.upsert({
    where: { code: "CONTAINER" },
    update: {},
    create: {
      code: "CONTAINER",
      name_i18n: { th: "ภาชนะ", en: "Container" },
      icon: "cup-soda",
      type: "ingredient",
      sort_order: 4,
      is_active: true,
    },
  });

  console.log("🏢 Creating warehouse...");
  const warehouse = await prisma.warehouse.upsert({
    where: { code: "WH001" },
    update: {},
    create: {
      code: "WH001",
      name_i18n: { th: "คลังหลัก", en: "Main Warehouse" },
      address: "L-Corner Store",
      is_active: true,
    },
  });

  console.log("📦 Creating ingredients...");
  const coffeeBean = await prisma.product.upsert({
    where: { code: "ING001" },
    update: {},
    create: {
      code: "ING001",
      name_i18n: { th: "เมล็ดกาแฟ", en: "Coffee Beans" },
      description_i18n: { th: "เมล็ดกาแฟคั่วบด", en: "Roasted Coffee Beans" },
      category_id: catCoffee.id,
      product_type_id: productTypeIngredient.id,
      base_unit_id: unitGram.id,
      current_stock: 5000,
      min_stock_level: 500,
      low_stock_threshold: 1000,
      cost_price: 0.5,
      track_stock: true,
      is_active: true,
    },
  });

  const milk = await prisma.product.upsert({
    where: { code: "ING002" },
    update: {},
    create: {
      code: "ING002",
      name_i18n: { th: "นมสด", en: "Fresh Milk" },
      category_id: catBeverage.id,
      product_type_id: productTypeIngredient.id,
      base_unit_id: unitMl.id,
      current_stock: 10000,
      min_stock_level: 2000,
      low_stock_threshold: 3000,
      cost_price: 0.03,
      track_stock: true,
      is_active: true,
    },
  });

  const sugarIngredient = await prisma.product.upsert({
    where: { code: "ING003" },
    update: {},
    create: {
      code: "ING003",
      name_i18n: { th: "น้ำตาล", en: "Sugar" },
      category_id: catBeverage.id,
      product_type_id: productTypeIngredient.id,
      base_unit_id: unitGram.id,
      current_stock: 3000,
      min_stock_level: 500,
      low_stock_threshold: 1000,
      cost_price: 0.02,
      track_stock: true,
      is_active: true,
    },
  });

  const water = await prisma.product.upsert({
    where: { code: "ING004" },
    update: {},
    create: {
      code: "ING004",
      name_i18n: { th: "น้ำเปล่า", en: "Water" },
      category_id: catBeverage.id,
      product_type_id: productTypeIngredient.id,
      base_unit_id: unitMl.id,
      current_stock: 50000,
      min_stock_level: 10000,
      low_stock_threshold: 15000,
      cost_price: 0.001,
      track_stock: true,
      is_active: true,
    },
  });

  const teaLeaf = await prisma.product.upsert({
    where: { code: "ING005" },
    update: {},
    create: {
      code: "ING005",
      name_i18n: { th: "ใบชาเขียว", en: "Green Tea Leaves" },
      category_id: catTea.id,
      product_type_id: productTypeIngredient.id,
      base_unit_id: unitGram.id,
      current_stock: 2000,
      min_stock_level: 300,
      low_stock_threshold: 500,
      cost_price: 0.3,
      track_stock: true,
      is_active: true,
    },
  });

  console.log("☕ Creating semi-finished products (with recipes)...");
  const espressoShot = await prisma.product.upsert({
    where: { code: "SEMI001" },
    update: {},
    create: {
      code: "SEMI001",
      name_i18n: { th: "เอสเพรสโซ่ 1 ช็อต", en: "Espresso Shot" },
      description_i18n: { th: "เอสเพรสโซ่สำหรับทำเครื่องดื่ม", en: "Espresso for beverages" },
      category_id: catCoffee.id,
      product_type_id: productTypeSemiFinished.id,
      base_unit_id: unitPiece.id,
      current_stock: 0,
      track_stock: false,
      is_active: true,
    },
  });

  const espressoRecipe = await prisma.recipe.create({
    data: {
      product_id: espressoShot.id,
      name_i18n: { th: "สูตรมาตรฐาน", en: "Standard Recipe" },
      is_default: true,
      serving_qty: 1,
      serving_unit_id: unitPiece.id,
      is_active: true,
    },
  });

  await prisma.recipeIngredient.createMany({
    data: [
      {
        recipe_id: espressoRecipe.id,
        ingredient_id: coffeeBean.id,
        quantity: 18,
        unit_id: unitGram.id,
        base_quantity: 18,
      },
      {
        recipe_id: espressoRecipe.id,
        ingredient_id: water.id,
        quantity: 30,
        unit_id: unitMl.id,
        base_quantity: 30,
      },
    ],
  });

  console.log("🍹 Creating finished goods (ready to sell)...");
  const latte = await prisma.product.upsert({
    where: { code: "FG001" },
    update: {},
    create: {
      code: "FG001",
      name_i18n: { th: "ลาเต้", en: "Latte" },
      description_i18n: { th: "กาแฟลาเต้ร้อน/เย็น", en: "Hot/Iced Latte" },
      category_id: catCoffee.id,
      product_type_id: productTypeFinishedGood.id,
      base_unit_id: unitCup.id,
      current_stock: 0,
      selling_price: 55,
      track_stock: false,
      is_active: true,
    },
  });

  const latteRecipe = await prisma.recipe.create({
    data: {
      product_id: latte.id,
      name_i18n: { th: "ไซส์ M", en: "Size M" },
      is_default: true,
      serving_qty: 1,
      serving_unit_id: unitCup.id,
      is_active: true,
    },
  });

  await prisma.recipeIngredient.createMany({
    data: [
      {
        recipe_id: latteRecipe.id,
        ingredient_id: espressoShot.id,
        quantity: 2,
        unit_id: unitPiece.id,
        base_quantity: 2,
      },
      {
        recipe_id: latteRecipe.id,
        ingredient_id: milk.id,
        quantity: 200,
        unit_id: unitMl.id,
        base_quantity: 200,
      },
      {
        recipe_id: latteRecipe.id,
        ingredient_id: sugarIngredient.id,
        quantity: 10,
        unit_id: unitGram.id,
        base_quantity: 10,
        is_optional: true,
      },
    ],
  });

  const cappuccino = await prisma.product.upsert({
    where: { code: "FG002" },
    update: {},
    create: {
      code: "FG002",
      name_i18n: { th: "คาปูชิโน่", en: "Cappuccino" },
      description_i18n: { th: "คาปูชิโน่ร้อน/เย็น", en: "Hot/Iced Cappuccino" },
      category_id: catCoffee.id,
      product_type_id: productTypeFinishedGood.id,
      base_unit_id: unitCup.id,
      current_stock: 0,
      selling_price: 60,
      track_stock: false,
      is_active: true,
    },
  });

  const cappuccinoRecipe = await prisma.recipe.create({
    data: {
      product_id: cappuccino.id,
      name_i18n: { th: "ไซส์ M", en: "Size M" },
      is_default: true,
      serving_qty: 1,
      serving_unit_id: unitCup.id,
      is_active: true,
    },
  });

  await prisma.recipeIngredient.createMany({
    data: [
      {
        recipe_id: cappuccinoRecipe.id,
        ingredient_id: espressoShot.id,
        quantity: 2,
        unit_id: unitPiece.id,
        base_quantity: 2,
      },
      {
        recipe_id: cappuccinoRecipe.id,
        ingredient_id: milk.id,
        quantity: 150,
        unit_id: unitMl.id,
        base_quantity: 150,
      },
    ],
  });

  const greenTea = await prisma.product.upsert({
    where: { code: "FG003" },
    update: {},
    create: {
      code: "FG003",
      name_i18n: { th: "ชาเขียว", en: "Green Tea" },
      description_i18n: { th: "ชาเขียวร้อน/เย็น", en: "Hot/Iced Green Tea" },
      category_id: catTea.id,
      product_type_id: productTypeFinishedGood.id,
      base_unit_id: unitCup.id,
      current_stock: 0,
      selling_price: 40,
      track_stock: false,
      is_active: true,
    },
  });

  const greenTeaRecipe = await prisma.recipe.create({
    data: {
      product_id: greenTea.id,
      name_i18n: { th: "ไซส์ M", en: "Size M" },
      is_default: true,
      serving_qty: 1,
      serving_unit_id: unitCup.id,
      is_active: true,
    },
  });

  await prisma.recipeIngredient.createMany({
    data: [
      {
        recipe_id: greenTeaRecipe.id,
        ingredient_id: teaLeaf.id,
        quantity: 5,
        unit_id: unitGram.id,
        base_quantity: 5,
      },
      {
        recipe_id: greenTeaRecipe.id,
        ingredient_id: water.id,
        quantity: 250,
        unit_id: unitMl.id,
        base_quantity: 250,
      },
      {
        recipe_id: greenTeaRecipe.id,
        ingredient_id: sugarIngredient.id,
        quantity: 15,
        unit_id: unitGram.id,
        base_quantity: 15,
        is_optional: true,
      },
    ],
  });

  const americano = await prisma.product.upsert({
    where: { code: "FG004" },
    update: {},
    create: {
      code: "FG004",
      name_i18n: { th: "อเมริกาโน่", en: "Americano" },
      description_i18n: { th: "อเมริกาโน่ร้อน/เย็น", en: "Hot/Iced Americano" },
      category_id: catCoffee.id,
      product_type_id: productTypeFinishedGood.id,
      base_unit_id: unitCup.id,
      current_stock: 0,
      selling_price: 45,
      track_stock: false,
      is_active: true,
    },
  });

  const americanoRecipe = await prisma.recipe.create({
    data: {
      product_id: americano.id,
      name_i18n: { th: "ไซส์ M", en: "Size M" },
      is_default: true,
      serving_qty: 1,
      serving_unit_id: unitCup.id,
      is_active: true,
    },
  });

  await prisma.recipeIngredient.createMany({
    data: [
      {
        recipe_id: americanoRecipe.id,
        ingredient_id: espressoShot.id,
        quantity: 2,
        unit_id: unitPiece.id,
        base_quantity: 2,
      },
      {
        recipe_id: americanoRecipe.id,
        ingredient_id: water.id,
        quantity: 200,
        unit_id: unitMl.id,
        base_quantity: 200,
      },
    ],
  });

  console.log("✅ Seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log("- 3 Roles created");
  console.log("- 1 Admin user created (username: admin, password: admin123)");
  console.log("- 4 Units created");
  console.log("- 3 Categories created");
  console.log("- 3 Product Types created (ingredient, semi_finished, finished_good)");
  console.log("- 1 Warehouse created");
  console.log("- 5 Ingredients created");
  console.log("- 1 Semi-finished product created (Espresso Shot)");
  console.log("- 4 Finished goods created (Latte, Cappuccino, Green Tea, Americano)");
  console.log("- All products have recipes with ingredients");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
