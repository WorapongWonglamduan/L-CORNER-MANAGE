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
} as const;

// GET /api/users/[id] - fetch a single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "users.view");
    if (denied) return denied;

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: USER_SAFE_SELECT,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 },
    );
  }
}

// PUT /api/users/[id] - update a user (and optionally replace role assignments)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "users.update");
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json();
    const { username, email, password, full_name, is_active, role_ids } =
      body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (username || email) {
      const conflict = await prisma.user.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(username ? [{ username }] : []),
            ...(email ? [{ email }] : []),
          ],
        },
      });
      if (conflict) {
        return NextResponse.json(
          {
            error:
              username && conflict.username === username
                ? "Username is already taken"
                : "Email is already taken",
          },
          { status: 400 },
        );
      }
    }

    let hashedPassword: string | undefined;
    if (password && String(password).length > 0) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const user = await prisma.$transaction(async (tx) => {
      if (role_ids !== undefined) {
        await tx.userRole.deleteMany({ where: { user_id: id } });
        if (Array.isArray(role_ids) && role_ids.length > 0) {
          await tx.userRole.createMany({
            data: role_ids.map((role_id: string) => ({
              user_id: id,
              role_id,
            })),
          });
        }
      }

      return tx.user.update({
        where: { id },
        data: {
          username: username ?? existing.username,
          email: email ?? existing.email,
          full_name: full_name ?? existing.full_name,
          is_active: is_active !== undefined ? is_active : existing.is_active,
          ...(hashedPassword ? { password: hashedPassword } : {}),
        },
        select: USER_SAFE_SELECT,
      });
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}

// DELETE /api/users/[id] - soft delete (deactivate) a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "users.delete");
    if (denied) return denied;

    const { id } = await params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id },
      data: { is_active: false },
    });

    return NextResponse.json({ message: "User deactivated successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 },
    );
  }
}
