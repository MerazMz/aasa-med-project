import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Access denied" },
        { status: 401 }
      );
    }

    const { id: productId } = await params;

    // Fetch product to verify owner
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 444 }
      );
    }

    // Verify permission: Must be ADMIN or the SELLER who listed it
    const isOwner = product.sellerId === user.userId;
    const isAdmin = user.role === "ADMIN";

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to delete this product" },
        { status: 403 }
      );
    }

    // Delete product and its order items cascade in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete order items referencing this product
      await tx.orderItem.deleteMany({
        where: { productId },
      });

      // 2. Delete the product
      await tx.product.delete({
        where: { id: productId },
      });
    }, {
      maxWait: 10000,
      timeout: 15000,
    });

    return NextResponse.json({
      message: "Product deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
