import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "COMPLETED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user || (user.role !== "ADMIN" && user.role !== "SELLER")) {
      return NextResponse.json(
        { error: "Unauthorized: Seller or Admin access required" },
        { status: 403 }
      );
    }

    const { id: orderId } = await params;
    const body = await request.json();
    const result = statusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status: newStatus } = result.data;

    // Check permissions: Sellers can only modify orders containing their own products
    if (user.role === "SELLER") {
      const orderMatch = await prisma.order.count({
        where: {
          id: orderId,
          items: {
            some: {
              product: {
                sellerId: user.userId,
              },
            },
          },
        },
      });

      if (orderMatch === 0) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to manage this order" },
          { status: 403 }
        );
      }
    }

    // Run order status transition in a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Fetch current order state
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!currentOrder) {
        throw new Error(`Order with ID "${orderId}" not found`);
      }

      // If status is already same, do nothing
      if (currentOrder.status === newStatus) {
        return currentOrder;
      }

      // 2. Refund stock if rejecting a non-rejected order
      if (newStatus === "REJECTED" && currentOrder.status !== "REJECTED") {
        for (const item of currentOrder.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (product) {
            const currentStock = parseFloat(product.stockQuantity.toString());
            const refundQty = parseFloat(item.convertedQuantity.toString());
            
            await tx.product.update({
              where: { id: product.id },
              data: { stockQuantity: currentStock + refundQty },
            });
          }
        }
      }

      // 3. Re-deduct stock if transitioning out of REJECTED to something else
      if (currentOrder.status === "REJECTED" && newStatus !== "REJECTED") {
        for (const item of currentOrder.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (product) {
            const currentStock = parseFloat(product.stockQuantity.toString());
            const deductQty = parseFloat(item.convertedQuantity.toString());

            if (deductQty > currentStock) {
              throw new Error(
                `Cannot restore order: Insufficient stock for product "${product.name}". Required: ${deductQty}, Available: ${currentStock}`
              );
            }

            await tx.product.update({
              where: { id: product.id },
              data: { stockQuantity: currentStock - deductQty },
            });
          }
        }
      }

      // 4. Update order status
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      return order;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    return NextResponse.json({
      message: `Order status updated to ${newStatus}`,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("Order status update error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 400 }
    );
  }
}
