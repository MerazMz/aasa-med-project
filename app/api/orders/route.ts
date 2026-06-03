import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { 
  convertQuantityToBase, 
  convertPriceFromBase, 
  getUnitGroup, 
  getConversionFactorToBase, 
  SupportedUnit 
} from "@/lib/conversions";
import { NextResponse } from "next/server";
import { z } from "zod";

const orderItemInputSchema = z.object({
  productId: z.string(),
  orderedQuantity: z.number().positive("Quantity must be positive"),
  orderedUnit: z.enum(["GRAM", "KILOGRAM", "MILLILITER", "LITER", "ITEM"]),
});

const orderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, "Order must have at least 1 item"),
});

// GET: Fetch orders list
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Access denied" },
        { status: 401 }
      );
    }

    let orders;
    if (user.role === "ADMIN") {
      // Admins view all orders and all items
      orders = await prisma.order.findMany({
        include: {
          user: {
            select: { name: true, email: true, role: true },
          },
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (user.role === "SELLER") {
      // Sellers view only orders containing their products, and only see their own items
      orders = await prisma.order.findMany({
        where: {
          items: {
            some: {
              product: {
                sellerId: user.userId,
              },
            },
          },
        },
        include: {
          user: {
            select: { name: true, email: true, role: true },
          },
          items: {
            where: {
              product: {
                sellerId: user.userId,
              },
            },
            include: { product: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Buyers view only their own orders
      orders = await prisma.order.findMany({
        where: { userId: user.userId },
        include: {
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: Create a new order/quotation
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Access denied" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = orderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { items: inputItems } = result.data;

    // We run the calculations and database inserts in a Prisma Transaction
    const orderResult = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsToCreate = [];

      for (const item of inputItems) {
        // 1. Fetch product
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product with ID "${item.productId}" not found`);
        }

        // 2. Validate unit compatibility
        const productGroup = getUnitGroup(product.baseUnit as SupportedUnit);
        const orderUnitGroup = getUnitGroup(item.orderedUnit as SupportedUnit);

        if (productGroup !== orderUnitGroup) {
          throw new Error(
            `Invalid unit: Cannot order product "${product.name}" (dimension group: ${productGroup}) in unit "${item.orderedUnit}" (dimension group: ${orderUnitGroup})`
          );
        }

        // 3. Convert ordered quantity to base unit (grams, milliliters, items)
        const convertedQuantity = convertQuantityToBase(item.orderedQuantity, item.orderedUnit as SupportedUnit);

        // 4. Verify stock
        const stockQty = parseFloat(product.stockQuantity.toString());
        if (convertedQuantity > stockQty) {
          throw new Error(
            `Insufficient stock for "${product.name}": Available ${stockQty} base units, requested ${convertedQuantity} base units`
          );
        }

        // 5. Calculate rate & subtotal
        const basePrice = parseFloat(product.basePrice.toString());
        const conversionFactor = getConversionFactorToBase(item.orderedUnit as SupportedUnit);
        const pricePerUnit = basePrice * conversionFactor;
        const subtotal = item.orderedQuantity * pricePerUnit;

        totalAmount += subtotal;

        // 6. Deduct stock from product
        const newStock = stockQty - convertedQuantity;
        await tx.product.update({
          where: { id: product.id },
          data: { stockQuantity: newStock },
        });

        orderItemsToCreate.push({
          productId: product.id,
          orderedQuantity: item.orderedQuantity,
          orderedUnit: item.orderedUnit,
          convertedQuantity,
          pricePerUnit,
          subtotal,
        });
      }

      // 7. Create the Order
      const newOrder = await tx.order.create({
        data: {
          userId: user.userId,
          totalAmount,
          status: "PENDING",
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      return newOrder;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    return NextResponse.json(
      { message: "Order/Quotation placed successfully", order: orderResult },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 400 }
    );
  }
}
