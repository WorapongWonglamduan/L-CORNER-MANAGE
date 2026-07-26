import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
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
