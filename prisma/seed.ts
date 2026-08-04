import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_DATABASE,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function cleanup() {
  console.log("🧹 Cleaning up old data...");

  // Delete in correct order to respect foreign key constraints — children
  // before parents. Tables added after the original seed script (toppings,
  // promotions, sales, media) must be cleared first, since Product/User/
  // Warehouse rows can't be deleted while sales/media still reference them.
  await prisma.stockMovement.deleteMany({});
  await prisma.stockTransfer.deleteMany({});
  await prisma.productStock.deleteMany({});
  await prisma.saleItemTopping.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.productTopping.deleteMany({});
  await prisma.topping.deleteMany({});
  await prisma.promotion.deleteMany({});
  await prisma.productMedia.deleteMany({});
  await prisma.media.deleteMany({});
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
  await prisma.appSettings.deleteMany({});
  await prisma.shop.deleteMany({});

  console.log("✅ Cleanup completed!");
}

async function main() {
  console.log("🌱 Starting seed...");
  
  // Cleanup old data first
  await cleanup();

  console.log("🏬 Creating L-Corner shop...");
  const lcornerShop = await prisma.shop.upsert({
    where: { id: "shop-lcorner" },
    update: {},
    create: {
      id: "shop-lcorner",
      name_i18n: { th: "แอล คอร์เนอร์", en: "L-Corner" },
      is_active: true,
    },
  });

  // Define permissions
  console.log("🔑 Defining permissions...");
  const allPermissions = [
    "users.view", "users.create", "users.update", "users.delete",
    "products.view", "products.create", "products.update", "products.delete",
    "inventory.view", "inventory.adjust", "inventory.transfer",
    "sales.view", "sales.create", "sales.void", "sales.refund",
    "reports.view",
    "settings.view", "settings.update",
  ];

  const managerPermissions = [
    "products.view", "products.create", "products.update", "products.delete",
    "inventory.view", "inventory.adjust", "inventory.transfer",
    "sales.view", "sales.create", "sales.void", "sales.refund",
    "reports.view",
  ];

  // Cashiers get sales.refund (return a couple of items on the spot) but not
  // sales.void — voiding a whole completed sale needs a manager/admin.
  const cashierPermissions = [
    "inventory.view",
    "sales.view", "sales.create", "sales.refund",
    "products.view",
  ];

  // Create Roles with permissions
  console.log("👥 Creating roles...");
  const adminRole = await prisma.role.upsert({
    where: { shop_id_name: { shop_id: lcornerShop.id, name: "admin" } },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      name: "admin",
      display_name_i18n: { th: "ผู้ดูแลระบบ", en: "Administrator" },
      description_i18n: { th: "เข้าถึงทุกฟังก์ชันในระบบ", en: "Full system access" },
      permissions: allPermissions,
      is_system: true,
      is_active: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { shop_id_name: { shop_id: lcornerShop.id, name: "manager" } },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      name: "manager",
      display_name_i18n: { th: "ผู้จัดการ", en: "Manager" },
      description_i18n: { th: "จัดการสินค้า สต็อก และรายงาน", en: "Manage products, inventory, and reports" },
      permissions: managerPermissions,
      is_system: true,
      is_active: true,
    },
  });

  const cashierRole = await prisma.role.upsert({
    where: { shop_id_name: { shop_id: lcornerShop.id, name: "cashier" } },
    update: {},
    create: {
      shop_id: lcornerShop.id,
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
      shop_id: lcornerShop.id,
      is_super_admin: true,
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
      shop_id: lcornerShop.id,
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
      shop_id: lcornerShop.id,
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
      shop_id: lcornerShop.id,
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
      shop_id: lcornerShop.id,
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
      shop_id: lcornerShop.id,
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
      shop_id: lcornerShop.id,
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
      shop_id: lcornerShop.id,
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
      shop_id: lcornerShop.id,
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
      shop_id: lcornerShop.id,
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
      shop_id: lcornerShop.id,
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
      shop_id: lcornerShop.id,
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
    where: { shop_id_code: { shop_id: lcornerShop.id, code: "WH001" } },
    update: {},
    create: {
      shop_id: lcornerShop.id,
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
      shop_id: lcornerShop.id,
      code: "ING001",
      name_i18n: { th: "เมล็ดกาแฟ", en: "Coffee Beans" },
      description_i18n: { th: "เมล็ดกาแฟคั่วบด", en: "Roasted Coffee Beans" },
      category_id: catCoffee.id,
      product_type_id: productTypeIngredient.id,
      base_unit_id: unitGram.id,
      cost_price: 0.5,
      track_stock: true,
      is_active: true,
    },
  });

  const milk = await prisma.product.upsert({
    where: { code: "ING002" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      code: "ING002",
      name_i18n: { th: "นมสด", en: "Fresh Milk" },
      category_id: catBeverage.id,
      product_type_id: productTypeIngredient.id,
      base_unit_id: unitMl.id,
      cost_price: 0.03,
      track_stock: true,
      is_active: true,
    },
  });

  const sugarIngredient = await prisma.product.upsert({
    where: { code: "ING003" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      code: "ING003",
      name_i18n: { th: "น้ำตาล", en: "Sugar" },
      category_id: catBeverage.id,
      product_type_id: productTypeIngredient.id,
      base_unit_id: unitGram.id,
      cost_price: 0.02,
      track_stock: true,
      is_active: true,
    },
  });

  const water = await prisma.product.upsert({
    where: { code: "ING004" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      code: "ING004",
      name_i18n: { th: "น้ำเปล่า", en: "Water" },
      category_id: catBeverage.id,
      product_type_id: productTypeIngredient.id,
      base_unit_id: unitMl.id,
      cost_price: 0.001,
      track_stock: true,
      is_active: true,
    },
  });

  const teaLeaf = await prisma.product.upsert({
    where: { code: "ING005" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      code: "ING005",
      name_i18n: { th: "ใบชาเขียว", en: "Green Tea Leaves" },
      category_id: catTea.id,
      product_type_id: productTypeIngredient.id,
      base_unit_id: unitGram.id,
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
      shop_id: lcornerShop.id,
      code: "SEMI001",
      name_i18n: { th: "เอสเพรสโซ่ 1 ช็อต", en: "Espresso Shot" },
      description_i18n: { th: "เอสเพรสโซ่สำหรับทำเครื่องดื่ม", en: "Espresso for beverages" },
      category_id: catCoffee.id,
      product_type_id: productTypeSemiFinished.id,
      base_unit_id: unitPiece.id,
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
      shop_id: lcornerShop.id,
      code: "FG001",
      name_i18n: { th: "ลาเต้", en: "Latte" },
      description_i18n: { th: "กาแฟลาเต้ร้อน/เย็น", en: "Hot/Iced Latte" },
      category_id: catCoffee.id,
      product_type_id: productTypeFinishedGood.id,
      base_unit_id: unitCup.id,
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
      shop_id: lcornerShop.id,
      code: "FG002",
      name_i18n: { th: "คาปูชิโน่", en: "Cappuccino" },
      description_i18n: { th: "คาปูชิโน่ร้อน/เย็น", en: "Hot/Iced Cappuccino" },
      category_id: catCoffee.id,
      product_type_id: productTypeFinishedGood.id,
      base_unit_id: unitCup.id,
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
      shop_id: lcornerShop.id,
      code: "FG003",
      name_i18n: { th: "ชาเขียว", en: "Green Tea" },
      description_i18n: { th: "ชาเขียวร้อน/เย็น", en: "Hot/Iced Green Tea" },
      category_id: catTea.id,
      product_type_id: productTypeFinishedGood.id,
      base_unit_id: unitCup.id,
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
      shop_id: lcornerShop.id,
      code: "FG004",
      name_i18n: { th: "อเมริกาโน่", en: "Americano" },
      description_i18n: { th: "อเมริกาโน่ร้อน/เย็น", en: "Hot/Iced Americano" },
      category_id: catCoffee.id,
      product_type_id: productTypeFinishedGood.id,
      base_unit_id: unitCup.id,
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

  console.log("🥤 Creating additional beverage/snack ingredients...");
  await prisma.product.upsert({
    where: { code: "RM0013" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      code: "RM0013",
      name_i18n: { th: "น้ำหวาน", en: "Nectar" },
      product_type_id: productTypeIngredient.id,
      base_unit_id: unitMl.id,
      track_stock: true,
      is_active: true,
    },
  });

  await prisma.product.upsert({
    where: { code: "RM00014" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      code: "RM00014",
      name_i18n: {
        th: "หัวเชื้อน้ำหวาน กลิ่นแตงโม",
        en: "Watermelon Flavored Nectar Essence",
      },
      product_type_id: productTypeIngredient.id,
      base_unit_id: unitMl.id,
      track_stock: true,
      is_active: true,
    },
  });

  const blueHawaiiEssence = await prisma.product.upsert({
    where: { code: "RM00016" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      code: "RM00016",
      name_i18n: { th: "หัวเชื้อบลูฮาวาย", en: "Blue Hawaii" },
      product_type_id: productTypeIngredient.id,
      base_unit_id: unitMl.id,
      cost_price: 0,
      track_stock: true,
      is_active: false,
    },
  });

  const blueSyrup = await prisma.product.upsert({
    where: { code: "RM0016" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      code: "RM0016",
      name_i18n: { th: "บูล", en: "Blue" },
      product_type_id: productTypeIngredient.id,
      base_unit_id: unitMl.id,
      track_stock: true,
      is_active: true,
    },
  });

  console.log("📂 Creating additional categories...");
  const catMamaCup = await prisma.category.upsert({
    where: { id: "cat-mama-cup" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      id: "cat-mama-cup",
      name_i18n: { th: "มาม่าคัพ", en: "MamaCup" },
      sort_order: 0,
      is_active: true,
    },
  });

  const catSnack = await prisma.category.upsert({
    where: { id: "cat-snack" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      id: "cat-snack",
      name_i18n: { th: "ขนม", en: "snack" },
      sort_order: 0,
      is_active: true,
    },
  });

  console.log("🍵 Creating Tea (semi-finished, made to order)...");
  const tea = await prisma.product.upsert({
    where: { code: "P00012" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      code: "P00012",
      name_i18n: { th: "ชา", en: "Tea" },
      category_id: catTea.id,
      product_type_id: productTypeSemiFinished.id,
      base_unit_id: unitCup.id,
      selling_price: 25,
      track_stock: true,
      is_active: true,
    },
  });

  const teaRecipe = await prisma.recipe.create({
    data: {
      product_id: tea.id,
      name_i18n: { th: "สูตรชา", en: "Recipe for Tea" },
      is_default: true,
      serving_qty: 1,
      serving_unit_id: unitCup.id,
      is_active: true,
    },
  });

  await prisma.recipeIngredient.createMany({
    data: [
      {
        recipe_id: teaRecipe.id,
        ingredient_id: teaLeaf.id,
        quantity: 150,
        unit_id: unitGram.id,
        base_quantity: 150,
      },
      {
        recipe_id: teaRecipe.id,
        ingredient_id: water.id,
        quantity: 250,
        unit_id: unitMl.id,
        base_quantity: 250,
      },
    ],
  });

  console.log("🍿 Creating snack/instant-noodle finished goods...");
  const mamaPork = await prisma.product.upsert({
    where: { code: "P00013" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      code: "P00013",
      name_i18n: { th: "มาม่าหมูสับ", en: "MamaPork" },
      category_id: catMamaCup.id,
      product_type_id: productTypeFinishedGood.id,
      base_unit_id: unitPiece.id,
      selling_price: 20,
      track_stock: true,
      is_active: true,
    },
  });

  const mamaShrimp = await prisma.product.upsert({
    where: { code: "P00015" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      code: "P00015",
      name_i18n: { th: "มาม่าต้มยำกุ้ง", en: "MamaShrimp" },
      category_id: catMamaCup.id,
      product_type_id: productTypeFinishedGood.id,
      base_unit_id: unitPiece.id,
      selling_price: 20,
      track_stock: true,
      is_active: true,
    },
  });

  const layOriginal = await prisma.product.upsert({
    where: { code: "P00016" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      code: "P00016",
      name_i18n: { th: "เลย์รสต้นตำหรับ", en: "Lay Original" },
      category_id: catSnack.id,
      product_type_id: productTypeFinishedGood.id,
      base_unit_id: unitPiece.id,
      track_stock: true,
      is_active: true,
    },
  });

  const kitkat = await prisma.product.upsert({
    where: { code: "P00017" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      code: "P00017",
      name_i18n: { th: "คิดแคท", en: "Kitkat" },
      category_id: catSnack.id,
      product_type_id: productTypeFinishedGood.id,
      base_unit_id: unitPiece.id,
      selling_price: 10,
      track_stock: true,
      is_active: true,
    },
  });

  const doritos = await prisma.product.upsert({
    where: { code: "P00018" },
    update: {},
    create: {
      shop_id: lcornerShop.id,
      code: "P00018",
      name_i18n: { th: "โดริโทส", en: "Doritos" },
      category_id: catSnack.id,
      product_type_id: productTypeFinishedGood.id,
      base_unit_id: unitPiece.id,
      selling_price: 20,
      cost_price: -2,
      track_stock: true,
      is_active: true,
    },
  });

  console.log("🖼️  Attaching product photos...");
  // Same files that were manually uploaded through the app's media upload UI
  // for these products — already committed under public/uploads/, so they
  // travel with the repo. Re-seeding just recreates the Media/ProductMedia
  // rows that point at them.
  const productPhotos: Array<{
    product: { id: string };
    filename: string;
    storedFilename: string;
    fileSize: number;
    mimeType: string;
    width: number;
    height: number;
  }> = [
    {
      product: doritos,
      filename: "doritos.jpg",
      storedFilename: "43b0ee13-2ede-405d-994b-9efe2af8a2dc.jpg",
      fileSize: 108389,
      mimeType: "image/jpeg",
      width: 800,
      height: 800,
    },
    {
      product: kitkat,
      filename: "kitkat.jpg",
      storedFilename: "f00077dd-d716-4a20-88a2-fdc9092112b4.jpg",
      fileSize: 88587,
      mimeType: "image/jpeg",
      width: 640,
      height: 640,
    },
    {
      product: layOriginal,
      filename: "layoriginal.jpg",
      storedFilename: "23965555-8312-486b-8fee-7f2262f6c4ee.jpg",
      fileSize: 98750,
      mimeType: "image/jpeg",
      width: 657,
      height: 800,
    },
    {
      product: mamaShrimp,
      filename: "mamacupshrim.jpg",
      storedFilename: "4a28fd3d-b80b-487e-8803-4368ee47e2fc.jpg",
      fileSize: 287647,
      mimeType: "image/jpeg",
      width: 1110,
      height: 1110,
    },
    {
      product: mamaPork,
      filename: "mamapork.jpg",
      storedFilename: "f0af4442-aa13-46c1-8d3f-9498b0c1ec8d.jpg",
      fileSize: 206877,
      mimeType: "image/jpeg",
      width: 1200,
      height: 1200,
    },
    {
      product: tea,
      filename: "tea2.jpg",
      storedFilename: "a4c59ce0-88a9-4e89-a21a-649ce2a05e6e.jpg",
      fileSize: 293933,
      mimeType: "image/jpeg",
      width: 649,
      height: 433,
    },
    {
      product: blueHawaiiEssence,
      filename: "blue-hawai.jpg",
      storedFilename: "790794f6-5e97-4f2c-8228-babb99509fed.jpg",
      fileSize: 67329,
      mimeType: "image/jpeg",
      width: 1024,
      height: 1024,
    },
    {
      product: blueSyrup,
      filename: "blue-hawai.jpg",
      storedFilename: "1baf9104-9c33-4dc9-85ad-92d835db11fb.jpg",
      fileSize: 67329,
      mimeType: "image/jpeg",
      width: 1024,
      height: 1024,
    },
  ];

  for (const photo of productPhotos) {
    const folderPath = "2026/03/products";
    const media = await prisma.media.upsert({
      where: { stored_filename: photo.storedFilename },
      update: {},
      create: {
        filename: photo.filename,
        stored_filename: photo.storedFilename,
        file_path: `/uploads/${folderPath}/original/${photo.storedFilename}`,
        thumbnail_path: `/uploads/${folderPath}/thumbnail/${photo.storedFilename}`,
        medium_path: `/uploads/${folderPath}/medium/${photo.storedFilename}`,
        file_size: photo.fileSize,
        mime_type: photo.mimeType,
        width: photo.width,
        height: photo.height,
        folder: "products",
        entity_type: "product",
        entity_id: photo.product.id,
      },
    });

    await prisma.productMedia.upsert({
      where: {
        product_id_media_id: {
          product_id: photo.product.id,
          media_id: media.id,
        },
      },
      update: {},
      create: {
        product_id: photo.product.id,
        media_id: media.id,
        is_primary: true,
        sort_order: 0,
      },
    });
  }

  console.log("📦 Seeding initial stock levels at the main warehouse...");
  const initialStock: Array<{
    code: string;
    current_stock: number;
    min_stock_level?: number;
    low_stock_threshold?: number;
  }> = [
    { code: "ING001", current_stock: 5000, min_stock_level: 500, low_stock_threshold: 1000 },
    { code: "ING002", current_stock: 10000, min_stock_level: 2000, low_stock_threshold: 3000 },
    { code: "ING003", current_stock: 3000, min_stock_level: 500, low_stock_threshold: 1000 },
    { code: "ING004", current_stock: 50000, min_stock_level: 10000, low_stock_threshold: 15000 },
    { code: "ING005", current_stock: 2000, min_stock_level: 300, low_stock_threshold: 500 },
    { code: "SEMI001", current_stock: 0 },
    { code: "FG001", current_stock: 0 },
    { code: "FG002", current_stock: 0 },
    { code: "FG003", current_stock: 0 },
    { code: "FG004", current_stock: 0 },
    { code: "RM0013", current_stock: 1000, min_stock_level: 400 },
    { code: "RM00014", current_stock: 1000, min_stock_level: 500 },
    { code: "RM00016", current_stock: 1000, min_stock_level: 500 },
    { code: "RM0016", current_stock: 1000, min_stock_level: 500 },
    { code: "P00012", current_stock: 0 },
    { code: "P00013", current_stock: 15, min_stock_level: 5 },
    { code: "P00015", current_stock: 15, min_stock_level: 5 },
    { code: "P00016", current_stock: 0 },
    { code: "P00017", current_stock: 9, min_stock_level: 3 },
    { code: "P00018", current_stock: 28, min_stock_level: 15 },
  ];

  for (const stock of initialStock) {
    const stockProduct = await prisma.product.findUnique({ where: { code: stock.code } });
    if (!stockProduct) continue;

    await prisma.productStock.upsert({
      where: {
        product_id_warehouse_id: { product_id: stockProduct.id, warehouse_id: warehouse.id },
      },
      update: {},
      create: {
        product_id: stockProduct.id,
        warehouse_id: warehouse.id,
        current_stock: stock.current_stock,
        min_stock_level: stock.min_stock_level || 0,
        low_stock_threshold: stock.low_stock_threshold || 0,
      },
    });
  }

  console.log("✅ Seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log("- 3 Roles created");
  console.log("- 1 Admin user created (username: admin, password: admin123)");
  console.log("- 4 Units created");
  console.log("- 5 Categories created");
  console.log("- 3 Product Types created (ingredient, semi_finished, finished_good)");
  console.log("- 1 Warehouse created");
  console.log("- 9 Ingredients created");
  console.log("- 2 Semi-finished products created (Espresso Shot, Tea)");
  console.log("- 9 Finished goods created (Latte, Cappuccino, Green Tea, Americano, 2x Mama Cup, Lay's, Kitkat, Doritos)");
  console.log("- All made-to-order products have recipes with ingredients");
  console.log("- 8 product photos attached");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
