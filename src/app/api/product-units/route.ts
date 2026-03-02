import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// POST /api/product-units - สร้าง product unit ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      product_id,
      unit_id,
      is_base_unit,
      is_selling_unit,
      selling_price,
      cost_price,
      conversion_to_base,
    } = body;

    // Validation
    if (!product_id || !unit_id) {
      return NextResponse.json(
        { error: "Product ID and Unit ID are required" },
        { status: 400 },
      );
    }

    const productUnit = await prisma.productUnit.create({
      data: {
        product_id,
        unit_id,
        is_base_unit: is_base_unit ?? false,
        is_selling_unit: is_selling_unit ?? false,
        selling_price: selling_price || null,
        cost_price: cost_price || null,
        conversion_to_base: conversion_to_base || 1,
        is_active: true,
      },
    });

    return NextResponse.json(productUnit, { status: 201 });
  } catch (error) {
    console.error("Error creating product unit:", error);
    return NextResponse.json(
      { error: "Failed to create product unit" },
      { status: 500 },
    );
  }
}
