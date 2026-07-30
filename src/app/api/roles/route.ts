import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePageSize } from "@/lib/pagination";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { ALL_PERMISSIONS } from "@/constants/permissions";

// GET /api/roles - list roles (paginated)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "users.view");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parsePageSize(searchParams);
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};

    if (isActive !== null) {
      where.is_active = isActive === "true";
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { display_name_i18n: { path: ["th"], string_contains: search } },
        { display_name_i18n: { path: ["en"], string_contains: search } },
      ];
    }

    const total = await prisma.role.count({ where });

    const roles = await prisma.role.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      items: roles,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 },
    );
  }
}

// POST /api/roles - create a new (non-system) role
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "users.create");
    if (denied) return denied;

    const body = await request.json();
    const { name, display_name_i18n, description_i18n, permissions, is_active } =
      body;

    if (!name || !display_name_i18n) {
      return NextResponse.json(
        { error: "name and display_name_i18n are required" },
        { status: 400 },
      );
    }

    const permissionList: string[] = Array.isArray(permissions)
      ? permissions
      : [];
    const invalid = permissionList.filter(
      (p) => !(ALL_PERMISSIONS as readonly string[]).includes(p),
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid permissions: ${invalid.join(", ")}` },
        { status: 400 },
      );
    }
    // A role's permissions are only gated by users.create, with no separate
    // "manage roles" permission in this app's model — without this check,
    // any custom role scoped down to just users.create/users.update could
    // create (or edit, see roles/[id]/route.ts) a role with FULL admin
    // permissions and assign it to itself via PUT /api/users/[id]. Callers
    // can only ever grant permissions they themselves already hold.
    const ungranted = permissionList.filter(
      (p) => !(session?.user?.permissions ?? []).includes(p),
    );
    if (ungranted.length > 0) {
      return NextResponse.json(
        { error: `Cannot grant permissions you don't hold yourself: ${ungranted.join(", ")}` },
        { status: 403 },
      );
    }

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: "Role name is already taken" },
        { status: 400 },
      );
    }

    const role = await prisma.role.create({
      data: {
        name,
        display_name_i18n,
        description_i18n: description_i18n ?? undefined,
        permissions: permissionList,
        is_system: false,
        is_active: is_active ?? true,
      },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 },
    );
  }
}
