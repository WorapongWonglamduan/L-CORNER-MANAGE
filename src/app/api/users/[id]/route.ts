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

    const user = await prisma.user.findFirst({
      where: { id, shop_id: session!.user.shop_id! },
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
    const {
      username,
      email,
      password,
      full_name,
      is_active,
      role_ids,
      warehouse_ids,
    } = body;

    const existing = await prisma.user.findFirst({
      where: { id, shop_id: session!.user.shop_id! },
    });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Nothing in this app can undo either of these once they land — no
    // in-app path back to an is_active:false or roleless admin account, so
    // catching them here (rather than trusting the UI to grey out the
    // option) is the only backstop against a single careless self-edit
    // locking every admin function for everyone.
    if (id === session?.user?.id) {
      if (is_active === false) {
        return NextResponse.json(
          { error: "Cannot deactivate your own account" },
          { status: 400 },
        );
      }
      if (role_ids !== undefined && Array.isArray(role_ids) && role_ids.length === 0) {
        return NextResponse.json(
          { error: "Cannot remove all of your own roles" },
          { status: 400 },
        );
      }
    }

    // Defense in depth alongside the same check in roles/route.ts and
    // roles/[id]/route.ts: even if a role's own permission set is locked
    // down correctly, assigning an EXISTING broader role (e.g. the seeded
    // admin role) to a user would still hand them permissions the caller
    // doesn't have. Block granting any role whose permissions aren't a
    // subset of the caller's own.
    if (role_ids !== undefined && Array.isArray(role_ids) && role_ids.length > 0) {
      const roles = await prisma.role.findMany({
        where: { id: { in: role_ids }, shop_id: session!.user.shop_id! },
        select: { id: true, permissions: true },
      });
      // Every requested role_id must resolve within the caller's own shop —
      // otherwise a role_id from another shop would skip the permission
      // check below entirely (its permissions wouldn't be in `roles`) while
      // still landing in user_roles further down, since userRole.createMany
      // has no shop check of its own.
      if (roles.length !== role_ids.length) {
        return NextResponse.json(
          { error: "One or more roles were not found" },
          { status: 400 },
        );
      }
      const grantedPermissions = new Set(
        roles.flatMap((r) => (Array.isArray(r.permissions) ? (r.permissions as string[]) : [])),
      );
      const callerPermissions = new Set(session?.user?.permissions ?? []);
      const ungranted = [...grantedPermissions].filter((p) => !callerPermissions.has(p));
      if (ungranted.length > 0) {
        return NextResponse.json(
          {
            error: `Cannot assign a role granting permissions you don't hold yourself: ${ungranted.join(", ")}`,
          },
          { status: 403 },
        );
      }
    }

    // Same reasoning as the role_ids check above: a warehouse_id from
    // another shop must not be silently attachable via userWarehouse.createMany.
    if (warehouse_ids !== undefined && Array.isArray(warehouse_ids) && warehouse_ids.length > 0) {
      const warehouses = await prisma.warehouse.findMany({
        where: { id: { in: warehouse_ids }, shop_id: session!.user.shop_id! },
        select: { id: true },
      });
      if (warehouses.length !== warehouse_ids.length) {
        return NextResponse.json(
          { error: "One or more warehouses were not found" },
          { status: 400 },
        );
      }
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

      if (warehouse_ids !== undefined) {
        await tx.userWarehouse.deleteMany({ where: { user_id: id } });
        if (Array.isArray(warehouse_ids) && warehouse_ids.length > 0) {
          await tx.userWarehouse.createMany({
            data: warehouse_ids.map((warehouse_id: string) => ({
              user_id: id,
              warehouse_id,
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

    if (id === session?.user?.id) {
      return NextResponse.json(
        { error: "Cannot deactivate your own account" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findFirst({
      where: { id, shop_id: session!.user.shop_id! },
    });
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
