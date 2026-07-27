import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import bcrypt from "bcryptjs";

// Explicit `select` (never `include`) so the password hash is never
// returned to the client.
const USER_SAFE_SELECT = {
  id: true,
  username: true,
  email: true,
  full_name: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  user_roles: {
    include: {
      role: {
        select: { id: true, name: true, display_name_i18n: true },
      },
    },
  },
  user_warehouses: {
    include: {
      warehouse: {
        select: { id: true, code: true, name_i18n: true },
      },
    },
  },
} as const;

// GET /api/users - list users (paginated)
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
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { full_name: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await prisma.user.count({ where });

    const users = await prisma.user.findMany({
      where,
      select: USER_SAFE_SELECT,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      items: users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

// POST /api/users - create a new user (starts with zero roles)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "users.create");
    if (denied) return denied;

    const body = await request.json();
    const { username, email, password, full_name, is_active } = body;

    if (!username || !email || !password || !full_name) {
      return NextResponse.json(
        { error: "username, email, password, and full_name are required" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            existing.username === username
              ? "Username is already taken"
              : "Email is already taken",
        },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        full_name,
        is_active: is_active ?? true,
      },
      select: USER_SAFE_SELECT,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
