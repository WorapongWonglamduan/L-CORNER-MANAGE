import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/sales/[id] - Get a single sale by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        warehouse: true,
        created_by_user: {
          select: {
            id: true,
            full_name: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                product_type: true,
              },
            },
            product_unit: {
              include: {
                unit: true,
              },
            },
            recipe: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json(sale);
  } catch (error: any) {
    console.error("Error fetching sale:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch sale" },
      { status: 500 },
    );
  }
}

// PUT /api/sales/[id] - Update a sale
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { payment_status, status, note } = body;

    const updatedSale = await prisma.sale.update({
      where: { id: params.id },
      data: {
        payment_status,
        status,
        note,
      },
      include: {
        customer: true,
        warehouse: true,
        created_by_user: {
          select: {
            id: true,
            full_name: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                product_type: true,
              },
            },
            product_unit: {
              include: {
                unit: true,
              },
            },
            recipe: true,
          },
        },
      },
    });

    return NextResponse.json(updatedSale);
  } catch (error: any) {
    console.error("Error updating sale:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update sale" },
      { status: 500 },
    );
  }
}

// DELETE /api/sales/[id] - Delete a sale (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update sale status to cancelled instead of hard delete
    const deletedSale = await prisma.sale.update({
      where: { id: params.id },
      data: {
        status: "cancelled",
      },
    });

    return NextResponse.json(deletedSale);
  } catch (error: any) {
    console.error("Error deleting sale:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete sale" },
      { status: 500 },
    );
  }
}
