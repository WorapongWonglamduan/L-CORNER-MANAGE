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

async function main() {
  console.log("🌱 Starting seed...");

  // Create Roles
  console.log("� Creating roles...");
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
      display_name_i18n: { th: "ผู้ดูแลระบบ", en: "Administrator" },
      description_i18n: { th: "เข้าถึงทุกฟังก์ชันในระบบ", en: "Full system access" },
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
      is_system: true,
      is_active: true,
    },
  });

  // Create Permissions
  console.log("🔑 Creating permissions...");
  const permissions = [
    // Users module
    { name: "users.view", display_name_i18n: { th: "ดูผู้ใช้", en: "View Users" }, module: "users" },
    { name: "users.create", display_name_i18n: { th: "สร้างผู้ใช้", en: "Create Users" }, module: "users" },
    { name: "users.update", display_name_i18n: { th: "แก้ไขผู้ใช้", en: "Update Users" }, module: "users" },
    { name: "users.delete", display_name_i18n: { th: "ลบผู้ใช้", en: "Delete Users" }, module: "users" },
    
    // Products module
    { name: "products.view", display_name_i18n: { th: "ดูสินค้า", en: "View Products" }, module: "products" },
    { name: "products.create", display_name_i18n: { th: "สร้างสินค้า", en: "Create Products" }, module: "products" },
    { name: "products.update", display_name_i18n: { th: "แก้ไขสินค้า", en: "Update Products" }, module: "products" },
    { name: "products.delete", display_name_i18n: { th: "ลบสินค้า", en: "Delete Products" }, module: "products" },
    
    // Inventory module
    { name: "inventory.view", display_name_i18n: { th: "ดูสต็อก", en: "View Inventory" }, module: "inventory" },
    { name: "inventory.adjust", display_name_i18n: { th: "ปรับสต็อก", en: "Adjust Inventory" }, module: "inventory" },
    
    // Sales module
    { name: "sales.view", display_name_i18n: { th: "ดูการขาย", en: "View Sales" }, module: "sales" },
    { name: "sales.create", display_name_i18n: { th: "ขายสินค้า", en: "Create Sales" }, module: "sales" },
    { name: "sales.void", display_name_i18n: { th: "ยกเลิกการขาย", en: "Void Sales" }, module: "sales" },
    
    // Purchases module
    { name: "purchases.view", display_name_i18n: { th: "ดูใบสั่งซื้อ", en: "View Purchases" }, module: "purchases" },
    { name: "purchases.create", display_name_i18n: { th: "สร้างใบสั่งซื้อ", en: "Create Purchases" }, module: "purchases" },
    { name: "purchases.receive", display_name_i18n: { th: "รับสินค้า", en: "Receive Purchases" }, module: "purchases" },
    
    // Reports module
    { name: "reports.view", display_name_i18n: { th: "ดูรายงาน", en: "View Reports" }, module: "reports" },
    
    // Settings module
    { name: "settings.view", display_name_i18n: { th: "ดูการตั้งค่า", en: "View Settings" }, module: "settings" },
    { name: "settings.update", display_name_i18n: { th: "แก้ไขการตั้งค่า", en: "Update Settings" }, module: "settings" },
  ];

  const createdPermissions = [];
  for (const perm of permissions) {
    const permission = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
    createdPermissions.push(permission);
  }

  // Assign all permissions to admin role
  console.log("🔗 Assigning permissions to roles...");
  for (const permission of createdPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: {
          role_id: adminRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: adminRole.id,
        permission_id: permission.id,
      },
    });
  }

  // Assign manager permissions
  const managerPermissions = createdPermissions.filter(p => 
    p.module !== 'users' && p.module !== 'settings'
  );
  for (const permission of managerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: {
          role_id: managerRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: managerRole.id,
        permission_id: permission.id,
      },
    });
  }

  // Assign cashier permissions
  const cashierPermissions = createdPermissions.filter(p => 
    ['inventory.view', 'sales.view', 'sales.create', 'products.view'].includes(p.name)
  );
  for (const permission of cashierPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: {
          role_id: cashierRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: cashierRole.id,
        permission_id: permission.id,
      },
    });
  }

  // Create admin user
  console.log("�👤 Creating admin user...");
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

  console.log("📦 Creating languages...");

  console.log("📏 Creating units...");
  const unitPiece = await prisma.unit.create({
    data: {
      name_i18n: { th: "ชิ้น", en: "Piece" },
      abbreviation_i18n: { th: "ชิ้น", en: "pcs" },
      unit_type: "quantity",
      is_base_unit: true,
      is_active: true,
    },
  });

  const unitGram = await prisma.unit.create({
    data: {
      name_i18n: { th: "กรัม", en: "Gram" },
      abbreviation_i18n: { th: "ก.", en: "g" },
      unit_type: "weight",
      is_base_unit: true,
      is_active: true,
    },
  });

  const unitKg = await prisma.unit.create({
    data: {
      name_i18n: { th: "กิโลกรัม", en: "Kilogram" },
      abbreviation_i18n: { th: "กก.", en: "kg" },
      unit_type: "weight",
      is_base_unit: false,
      is_active: true,
    },
  });

  const unitMl = await prisma.unit.create({
    data: {
      name_i18n: { th: "มิลลิลิตร", en: "Milliliter" },
      abbreviation_i18n: { th: "มล.", en: "ml" },
      unit_type: "volume",
      is_base_unit: true,
      is_active: true,
    },
  });

  const unitLiter = await prisma.unit.create({
    data: {
      name_i18n: { th: "ลิตร", en: "Liter" },
      abbreviation_i18n: { th: "ล.", en: "L" },
      unit_type: "volume",
      is_base_unit: false,
      is_active: true,
    },
  });

  const unitCup = await prisma.unit.create({
    data: {
      name_i18n: { th: "แก้ว", en: "Cup" },
      abbreviation_i18n: { th: "แก้ว", en: "cup" },
      unit_type: "quantity",
      is_base_unit: false,
      is_active: true,
    },
  });

  const unitBottle = await prisma.unit.create({
    data: {
      name_i18n: { th: "ขวด", en: "Bottle" },
      abbreviation_i18n: { th: "ขวด", en: "btl" },
      unit_type: "quantity",
      is_base_unit: false,
      is_active: true,
    },
  });

  const unitPack = await prisma.unit.create({
    data: {
      name_i18n: { th: "แพ็ค", en: "Pack" },
      abbreviation_i18n: { th: "แพ็ค", en: "pack" },
      unit_type: "quantity",
      is_base_unit: false,
      is_active: true,
    },
  });

  console.log("🔄 Creating unit conversions...");
  await prisma.unitConversion.createMany({
    data: [
      {
        from_unit_id: unitKg.id,
        to_unit_id: unitGram.id,
        conversion_factor: 1000,
      },
      {
        from_unit_id: unitGram.id,
        to_unit_id: unitKg.id,
        conversion_factor: 0.001,
      },
      {
        from_unit_id: unitLiter.id,
        to_unit_id: unitMl.id,
        conversion_factor: 1000,
      },
      {
        from_unit_id: unitMl.id,
        to_unit_id: unitLiter.id,
        conversion_factor: 0.001,
      },
    ],
  });

  console.log("📂 Creating categories...");
  const catBeverage = await prisma.category.create({
    data: {
      name_i18n: { th: "เครื่องดื่ม", en: "Beverages" },
      sort_order: 1,
      is_active: true,
    },
  });

  const catCoffee = await prisma.category.create({
    data: {
      name_i18n: { th: "กาแฟ", en: "Coffee" },
      parent_id: catBeverage.id,
      sort_order: 1,
      is_active: true,
    },
  });

  const catTea = await prisma.category.create({
    data: {
      name_i18n: { th: "ชา", en: "Tea" },
      parent_id: catBeverage.id,
      sort_order: 2,
      is_active: true,
    },
  });

  const catSnack = await prisma.category.create({
    data: {
      name_i18n: { th: "ขนมขบเคี้ยว", en: "Snacks" },
      sort_order: 2,
      is_active: true,
    },
  });

  const catInstantFood = await prisma.category.create({
    data: {
      name_i18n: { th: "อาหารสำเร็จรูป", en: "Instant Food" },
      sort_order: 3,
      is_active: true,
    },
  });

  console.log("🏢 Creating warehouse...");
  const warehouse = await prisma.warehouse.create({
    data: {
      code: "WH001",
      name_i18n: { th: "คลังหลัก", en: "Main Warehouse" },
      address: "L-Corner Store",
      is_active: true,
    },
  });

  console.log("📦 Creating raw materials (ingredients)...");
  const coffeeBean = await prisma.product.create({
    data: {
      code: "ING001",
      name_i18n: { th: "เมล็ดกาแฟ", en: "Coffee Beans" },
      description_i18n: { th: "เมล็ดกาแฟคั่วบด", en: "Roasted Coffee Beans" },
      category_id: catCoffee.id,
      product_type: "finished_good",
      base_unit_id: unitGram.id,
      track_stock: true,
      min_stock_level: 500,
      low_stock_threshold: 200,
      is_active: true,
    },
  });

  await prisma.productUnit.create({
    data: {
      product_id: coffeeBean.id,
      unit_id: unitGram.id,
      is_base_unit: true,
      is_purchase_unit: false,
      is_selling_unit: false,
      cost_price: 0.5,
      conversion_to_base: 1,
    },
  });

  await prisma.productUnit.create({
    data: {
      product_id: coffeeBean.id,
      unit_id: unitKg.id,
      is_base_unit: false,
      is_purchase_unit: true,
      is_selling_unit: false,
      cost_price: 500,
      conversion_to_base: 1000,
    },
  });

  const milk = await prisma.product.create({
    data: {
      code: "ING002",
      name_i18n: { th: "นมสด", en: "Fresh Milk" },
      category_id: catBeverage.id,
      product_type: "finished_good",
      base_unit_id: unitMl.id,
      track_stock: true,
      min_stock_level: 2000,
      low_stock_threshold: 1000,
      is_active: true,
    },
  });

  await prisma.productUnit.create({
    data: {
      product_id: milk.id,
      unit_id: unitMl.id,
      is_base_unit: true,
      is_purchase_unit: false,
      is_selling_unit: false,
      cost_price: 0.03,
      conversion_to_base: 1,
    },
  });

  await prisma.productUnit.create({
    data: {
      product_id: milk.id,
      unit_id: unitLiter.id,
      is_base_unit: false,
      is_purchase_unit: true,
      is_selling_unit: false,
      cost_price: 30,
      conversion_to_base: 1000,
    },
  });

  const sugar = await prisma.product.create({
    data: {
      code: "ING003",
      name_i18n: { th: "น้ำตาล", en: "Sugar" },
      product_type: "finished_good",
      base_unit_id: unitGram.id,
      track_stock: true,
      min_stock_level: 1000,
      low_stock_threshold: 500,
      is_active: true,
    },
  });

  await prisma.productUnit.create({
    data: {
      product_id: sugar.id,
      unit_id: unitGram.id,
      is_base_unit: true,
      cost_price: 0.02,
      conversion_to_base: 1,
    },
  });

  const greenTeaLeaf = await prisma.product.create({
    data: {
      code: "ING004",
      name_i18n: { th: "ใบชาเขียว", en: "Green Tea Leaves" },
      category_id: catTea.id,
      product_type: "finished_good",
      base_unit_id: unitGram.id,
      track_stock: true,
      min_stock_level: 500,
      low_stock_threshold: 200,
      is_active: true,
    },
  });

  await prisma.productUnit.create({
    data: {
      product_id: greenTeaLeaf.id,
      unit_id: unitGram.id,
      is_base_unit: true,
      cost_price: 0.3,
      conversion_to_base: 1,
    },
  });

  console.log("☕ Creating made-to-order products...");
  const latte = await prisma.product.create({
    data: {
      code: "PROD001",
      name_i18n: { th: "ลาเต้", en: "Latte" },
      description_i18n: { th: "กาแฟลาเต้", en: "Coffee Latte" },
      category_id: catCoffee.id,
      product_type: "made_to_order",
      base_unit_id: unitCup.id,
      track_stock: false,
      is_active: true,
    },
  });

  await prisma.productUnit.create({
    data: {
      product_id: latte.id,
      unit_id: unitCup.id,
      is_base_unit: true,
      is_selling_unit: true,
      selling_price: 45,
      conversion_to_base: 1,
    },
  });

  const latteRecipeM = await prisma.recipe.create({
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
        recipe_id: latteRecipeM.id,
        ingredient_id: coffeeBean.id,
        quantity: 18,
        unit_id: unitGram.id,
        base_quantity: 18,
      },
      {
        recipe_id: latteRecipeM.id,
        ingredient_id: milk.id,
        quantity: 200,
        unit_id: unitMl.id,
        base_quantity: 200,
      },
      {
        recipe_id: latteRecipeM.id,
        ingredient_id: sugar.id,
        quantity: 10,
        unit_id: unitGram.id,
        base_quantity: 10,
        is_optional: true,
      },
    ],
  });

  const greenTea = await prisma.product.create({
    data: {
      code: "PROD002",
      name_i18n: { th: "ชาเขียว", en: "Green Tea" },
      category_id: catTea.id,
      product_type: "made_to_order",
      base_unit_id: unitCup.id,
      track_stock: false,
      is_active: true,
    },
  });

  await prisma.productUnit.create({
    data: {
      product_id: greenTea.id,
      unit_id: unitCup.id,
      is_base_unit: true,
      is_selling_unit: true,
      selling_price: 35,
      conversion_to_base: 1,
    },
  });

  const greenTeaRecipe = await prisma.recipe.create({
    data: {
      product_id: greenTea.id,
      name_i18n: { th: "ไซส์ปกติ", en: "Regular" },
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
        ingredient_id: greenTeaLeaf.id,
        quantity: 5,
        unit_id: unitGram.id,
        base_quantity: 5,
      },
      {
        recipe_id: greenTeaRecipe.id,
        ingredient_id: sugar.id,
        quantity: 15,
        unit_id: unitGram.id,
        base_quantity: 15,
        is_optional: true,
      },
    ],
  });

  console.log("🍜 Creating finished goods...");
  const instantNoodle = await prisma.product.create({
    data: {
      code: "PROD003",
      name_i18n: { th: "มาม่าคัพ", en: "Cup Noodles" },
      category_id: catInstantFood.id,
      product_type: "finished_good",
      base_unit_id: unitPiece.id,
      track_stock: true,
      min_stock_level: 20,
      low_stock_threshold: 10,
      is_active: true,
    },
  });

  await prisma.productUnit.create({
    data: {
      product_id: instantNoodle.id,
      unit_id: unitPiece.id,
      is_base_unit: true,
      is_purchase_unit: false,
      is_selling_unit: true,
      barcode: "8850987101014",
      selling_price: 15,
      cost_price: 10,
      conversion_to_base: 1,
    },
  });

  await prisma.productUnit.create({
    data: {
      product_id: instantNoodle.id,
      unit_id: unitPack.id,
      is_base_unit: false,
      is_purchase_unit: true,
      is_selling_unit: false,
      cost_price: 120,
      conversion_to_base: 12,
    },
  });

  const chips = await prisma.product.create({
    data: {
      code: "PROD004",
      name_i18n: { th: "มันฝรั่งทอด", en: "Potato Chips" },
      category_id: catSnack.id,
      product_type: "finished_good",
      base_unit_id: unitPiece.id,
      track_stock: true,
      min_stock_level: 15,
      low_stock_threshold: 5,
      is_active: true,
    },
  });

  await prisma.productUnit.create({
    data: {
      product_id: chips.id,
      unit_id: unitPiece.id,
      is_base_unit: true,
      is_selling_unit: true,
      selling_price: 20,
      cost_price: 12,
      conversion_to_base: 1,
    },
  });

  console.log("🍰 Creating toppings...");
  const toppingPearl = await prisma.topping.create({
    data: {
      name_i18n: { th: "ไข่มุก", en: "Tapioca Pearl" },
      category_id: catBeverage.id,
      quantity_per_order: 50,
      unit_id: unitGram.id,
      extra_price: 10,
      max_qty: 3,
      is_active: true,
    },
  });

  const toppingWhipCream = await prisma.topping.create({
    data: {
      name_i18n: { th: "วิปครีม", en: "Whipped Cream" },
      category_id: catBeverage.id,
      ingredient_id: milk.id,
      quantity_per_order: 30,
      unit_id: unitMl.id,
      extra_price: 15,
      max_qty: 2,
      is_active: true,
    },
  });

  await prisma.productTopping.createMany({
    data: [
      { product_id: latte.id, topping_id: toppingWhipCream.id, sort_order: 1 },
      { product_id: greenTea.id, topping_id: toppingPearl.id, sort_order: 1 },
    ],
  });

  console.log("📊 Creating initial stock...");
  await prisma.stock.createMany({
    data: [
      { product_id: coffeeBean.id, warehouse_id: warehouse.id, quantity: 5000 },
      { product_id: milk.id, warehouse_id: warehouse.id, quantity: 10000 },
      { product_id: sugar.id, warehouse_id: warehouse.id, quantity: 3000 },
      {
        product_id: greenTeaLeaf.id,
        warehouse_id: warehouse.id,
        quantity: 1000,
      },
      {
        product_id: instantNoodle.id,
        warehouse_id: warehouse.id,
        quantity: 50,
      },
      { product_id: chips.id, warehouse_id: warehouse.id, quantity: 30 },
    ],
  });

  console.log("👥 Creating sample customer...");
  await prisma.customer.create({
    data: {
      code: "CUST001",
      full_name: "Walk-in Customer",
      phone: "-",
      loyalty_points: 0,
      is_active: true,
    },
  });

  console.log("🏭 Creating sample supplier...");
  await prisma.supplier.create({
    data: {
      code: "SUP001",
      name: "Coffee Supplier Co., Ltd.",
      contact: "Mr. John",
      phone: "02-123-4567",
      email: "sales@coffeesupplier.com",
      is_active: true,
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
