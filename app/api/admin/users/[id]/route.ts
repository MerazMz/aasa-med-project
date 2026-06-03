import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getAuthenticatedUser(request);

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const { id: userIdToDelete } = await params;

    // Prevent self-deletion
    if (adminUser.userId === userIdToDelete) {
      return NextResponse.json(
        { error: "Forbidden: You cannot delete your own admin account" },
        { status: 400 }
      );
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userIdToDelete },
    });

    if (!userExists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 444 }
      );
    }

    // Cascade delete user data in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete order items of the orders placed by this user
      await tx.orderItem.deleteMany({
        where: {
          order: {
            userId: userIdToDelete,
          },
        },
      });

      // 2. Delete orders placed by this user
      await tx.order.deleteMany({
        where: {
          userId: userIdToDelete,
        },
      });

      // 3. Delete order items that reference products listed by this user (if seller)
      await tx.orderItem.deleteMany({
        where: {
          product: {
            sellerId: userIdToDelete,
          },
        },
      });

      // 4. Delete products listed by this user (if seller)
      await tx.product.deleteMany({
        where: {
          sellerId: userIdToDelete,
        },
      });

      // 5. Finally, delete the user
      await tx.user.delete({
        where: {
          id: userIdToDelete,
        },
      });
    }, {
      maxWait: 10000,
      timeout: 15000,
    });

    return NextResponse.json({
      message: "User and all associated data deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
