import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { parsePageSize } from "@/lib/pagination";
import { auth } from "@/auth";
import { requireSuperAdmin } from "@/lib/permissions";
import { ALL_PERMISSIONS } from "@/constants/permissions";
import { Prisma } from "@prisma/client";

// GET /api/admin/shops - list every shop (super admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requireSuperAdmin(session);
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parsePageSize(searchParams);
    const search = searchParams.get("search") || "";

    const where: Prisma.ShopWhereInput = {};
    if (search) {
      where.OR = [
        { name_i18n: { path: ["th"], string_contains: search } },
        { name_i18n: { path: ["en"], string_contains: search } },
      ];
    }

    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { users: true, warehouses: true } },
        },
      }),
      prisma.shop.count({ where }),
    ]);

    return NextResponse.json({
      items: shops,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching shops:", error);
    return NextResponse.json({ error: "Failed to fetch shops" }, { status: 500 });
  }
}

// POST /api/admin/shops - provision a brand-new shop: the shop itself, its
// three default roles (same permission sets as prisma/seed.ts), its first
// branch, and an owner user assigned to both. Super admin only — this is
// the one flow that creates cross-tenant data, so it deliberately lives
// outside the regular shop-scoped settings routes.
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requireSuperAdmin(session);
    if (denied) return denied;

    const body = await request.json();
    const {
      name_th,
      name_en,
      logo_path,
      branch_code,
      branch_name_th,
      branch_name_en,
      owner_email,
      owner_username,
      owner_password,
      owner_full_name,
    } = body;

    if (
      !name_th || !name_en ||
      !branch_code || !branch_name_th || !branch_name_en ||
      !owner_email || !owner_username || !owner_password || !owner_full_name
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (String(owner_password).length < 6) {
      return NextResponse.json(
        { error: "owner_password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email: owner_email } }),
      prisma.user.findUnique({ where: { username: owner_username } }),
    ]);
    if (existingEmail || existingUsername) {
      return NextResponse.json(
        { error: "owner_email or owner_username is already taken" },
        { status: 400 },
      );
    }

    // No shop_id-scoped duplicate check needed here: this always provisions
    // a brand-new Shop, so no existing warehouse can share its shop_id yet —
    // branch_code only needs to be unique within a shop (@@unique([shop_id,
    // code])), not across shops.
    const managerPermissions = [
      "products.view", "products.create", "products.update", "products.delete",
      "inventory.view", "inventory.adjust", "inventory.transfer",
      "sales.view", "sales.create", "sales.void", "sales.refund",
      "reports.view",
    ];
    const cashierPermissions = [
      "inventory.view",
      "sales.view", "sales.create", "sales.refund",
      "products.view",
    ];

    const hashedPassword = await bcrypt.hash(owner_password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          name_i18n: { th: name_th, en: name_en },
          logo_path: logo_path || null,
          is_active: true,
        },
      });

      const adminRole = await tx.role.create({
        data: {
          shop_id: shop.id,
          name: "admin",
          display_name_i18n: { th: "ผู้ดูแลระบบ", en: "Administrator" },
          description_i18n: { th: "เข้าถึงทุกฟังก์ชันในระบบ", en: "Full system access" },
          permissions: [...ALL_PERMISSIONS],
          is_system: true,
          is_active: true,
        },
      });

      await tx.role.create({
        data: {
          shop_id: shop.id,
          name: "manager",
          display_name_i18n: { th: "ผู้จัดการ", en: "Manager" },
          description_i18n: { th: "จัดการสินค้า สต็อก และรายงาน", en: "Manage products, inventory, and reports" },
          permissions: managerPermissions,
          is_system: true,
          is_active: true,
        },
      });

      await tx.role.create({
        data: {
          shop_id: shop.id,
          name: "cashier",
          display_name_i18n: { th: "พนักงานขาย", en: "Cashier" },
          description_i18n: { th: "ขายสินค้าและดูสต็อก", en: "Sales and view inventory" },
          permissions: cashierPermissions,
          is_system: true,
          is_active: true,
        },
      });

      const warehouse = await tx.warehouse.create({
        data: {
          shop_id: shop.id,
          code: branch_code,
          name_i18n: { th: branch_name_th, en: branch_name_en },
          is_active: true,
          is_default: true,
        },
      });

      const owner = await tx.user.create({
        data: {
          shop_id: shop.id,
          is_super_admin: false,
          username: owner_username,
          email: owner_email,
          password: hashedPassword,
          full_name: owner_full_name,
          is_active: true,
        },
      });

      await tx.userRole.create({
        data: { user_id: owner.id, role_id: adminRole.id },
      });
      await tx.userWarehouse.create({
        data: { user_id: owner.id, warehouse_id: warehouse.id },
      });

      return { shop, warehouse, owner };
    });

    return NextResponse.json(
      {
        shop: result.shop,
        warehouse: result.warehouse,
        owner: { id: result.owner.id, email: result.owner.email, username: result.owner.username },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error provisioning shop:", error);
    return NextResponse.json({ error: "Failed to provision shop" }, { status: 500 });
  }
}
