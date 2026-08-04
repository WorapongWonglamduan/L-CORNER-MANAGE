import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions";
import { ALL_PERMISSIONS } from "@/constants/permissions";

// GET /api/roles/[id] - fetch a single role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "users.view");
    if (denied) return denied;

    const { id } = await params;

    const role = await prisma.role.findFirst({
      where: { id, shop_id: session!.user.shop_id! },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { error: "Failed to fetch role" },
      { status: 500 },
    );
  }
}

// PUT /api/roles/[id] - update a role
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
    // `is_system` is intentionally ignored — it can never be changed via this endpoint.
    const { name, display_name_i18n, description_i18n, permissions, is_active } =
      body;
    const shopId = session!.user.shop_id!;

    const existing = await prisma.role.findFirst({ where: { id, shop_id: shopId } });
    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (permissions !== undefined) {
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
      // Same guard as POST /api/roles: this endpoint (gated only by
      // users.update, this app's only "manage roles" permission) would
      // otherwise let any holder rewrite ANY role's permissions — including
      // is_system roles like admin/manager/cashier — up to and including
      // full admin. Callers can only ever grant permissions they themselves
      // already hold.
      const ungranted = permissionList.filter(
        (p) => !(session?.user?.permissions ?? []).includes(p),
      );
      if (ungranted.length > 0) {
        return NextResponse.json(
          { error: `Cannot grant permissions you don't hold yourself: ${ungranted.join(", ")}` },
          { status: 403 },
        );
      }
    }

    if (name && name !== existing.name) {
      if (existing.is_system) {
        return NextResponse.json(
          { error: "Cannot rename a system role" },
          { status: 400 },
        );
      }
      const conflict = await prisma.role.findFirst({
        where: { id: { not: id }, shop_id: shopId, name },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "Role name is already taken" },
          { status: 400 },
        );
      }
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        name: existing.is_system ? existing.name : name ?? existing.name,
        display_name_i18n: display_name_i18n ?? existing.display_name_i18n,
        description_i18n: description_i18n ?? existing.description_i18n,
        permissions: permissions !== undefined ? permissions : existing.permissions,
        is_active: is_active !== undefined ? is_active : existing.is_active,
      },
    });

    return NextResponse.json(role);
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 },
    );
  }
}

// DELETE /api/roles/[id] - soft delete (deactivate) a role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const denied = requirePermission(session, "users.delete");
    if (denied) return denied;

    const { id } = await params;

    const existing = await prisma.role.findFirst({
      where: { id, shop_id: session!.user.shop_id! },
    });
    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (existing.is_system) {
      return NextResponse.json(
        { error: "Cannot delete a system role" },
        { status: 400 },
      );
    }

    const assignedCount = await prisma.userRole.count({
      where: { role_id: id },
    });
    if (assignedCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete a role that is still assigned to users" },
        { status: 400 },
      );
    }

    await prisma.role.update({
      where: { id },
      data: { is_active: false },
    });

    return NextResponse.json({ message: "Role deactivated successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 },
    );
  }
}
