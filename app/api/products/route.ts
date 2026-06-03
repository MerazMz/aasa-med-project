import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { convertQuantityToBase, convertPriceToBase, getBaseUnit, SupportedUnit } from "@/lib/conversions";
import { NextResponse } from "next/server";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  sku: z.string().min(2, "SKU must be at least 2 characters"),
  description: z.string().optional().nullable(),
  inputUnit: z.enum(["GRAM", "KILOGRAM", "MILLILITER", "LITER", "ITEM"]),
  inputQuantity: z.number().positive("Quantity must be positive"),
  inputPrice: z.number().positive("Price must be positive"),
});

// GET: Fetch products with filtering and search
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const user = await getAuthenticatedUser(request);

    const whereCondition: any = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    };

    // If the authenticated user is a Seller, filter products to only their own
    if (user && user.role === "SELLER") {
      whereCondition.sellerId = user.userId;
    }

    const products = await prisma.product.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Fetch products error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: Create product (Sellers only)
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user || (user.role !== "SELLER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized: Seller or Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = productSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, sku, description, inputUnit, inputQuantity, inputPrice } = result.data;

    // Check unique SKU
    const existingProduct = await prisma.product.findUnique({
      where: { sku },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: `Product with SKU "${sku}" already exists` },
        { status: 400 }
      );
    }

    // Determine base unit (smallest unit for that dimension)
    const baseUnit = getBaseUnit(inputUnit as SupportedUnit);

    // Convert stock quantity and price to base units
    const baseStockQuantity = convertQuantityToBase(inputQuantity, inputUnit as SupportedUnit);
    const basePricePerUnit = convertPriceToBase(inputPrice, inputUnit as SupportedUnit);

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        description,
        baseUnit,
        stockQuantity: baseStockQuantity,
        basePrice: basePricePerUnit,
        sellerId: user.userId, // Link to the seller
      },
    });

    return NextResponse.json(
      { message: "Product listed successfully", product },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
