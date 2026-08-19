import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orders,
  inventoryItems,
  branchInventory,
  inventoryMovements,
} from "@/app/db/schema";
import { requireRole, isAuthError } from "@/lib/auth-utils";
import type { OrderBasketItem, OrderStatus } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Only Admin or Inventory Manager can update order status
  const authResult = await requireRole("ADMIN", "IM");
  if (isAuthError(authResult)) return authResult;

  const currentUser = authResult.user;
  const { id } = await params;
  const orderId = Number(id);

  if (!orderId || isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { status: OrderStatus; notes?: string };
    const nextStatus = body.status;

    if (!nextStatus) {
      return NextResponse.json(
        { error: "New order status is required" },
        { status: 400 }
      );
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.orderId, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "FULFILLED") {
      return NextResponse.json(
        { error: "Order is already fulfilled and cannot be modified further" },
        { status: 400 }
      );
    }

    if (nextStatus === "FULFILLED") {
      const year = order.createdOn ? new Date(order.createdOn).getFullYear() : new Date().getFullYear();
      const paddedId = String(order.orderId).padStart(4, "0");
      const displayOrderId = `${year}-${paddedId}`;

      const items = (order.orderList as OrderBasketItem[]) || [];

      for (const item of items) {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) continue;

        // 1. Get current central item stock
        const masterItem = await db.query.inventoryItems.findFirst({
          where: eq(inventoryItems.itemId, item.itemId),
        });

        if (!masterItem) continue;

        const prevCentralStock = masterItem.centralStock;
        const newCentralStock = Math.max(0, prevCentralStock - qty);

        // Update central stock
        await db
          .update(inventoryItems)
          .set({
            centralStock: newCentralStock,
            status: newCentralStock <= 10 ? "LOW_STOCK" : "IN_STOCK",
            lastUpdated: new Date(),
          })
          .where(eq(inventoryItems.itemId, item.itemId));

        // Record central deduction movement
        await db.insert(inventoryMovements).values({
          itemId: item.itemId,
          branchId: order.branchId,
          movementType: "ORDER_FULFILLED",
          quantity: -qty,
          previousBalance: prevCentralStock,
          newBalance: newCentralStock,
          userId: currentUser.id,
          referenceId: `ORDER-#${order.orderId}`,
          reason: `Fulfilled order #${displayOrderId} to Branch ${order.branchId}`,
        });

        // 2. Update Branch stock
        const existingBranchItem = await db.query.branchInventory.findFirst({
          where: and(
            eq(branchInventory.branchId, order.branchId),
            eq(branchInventory.itemId, item.itemId)
          ),
        });

        if (existingBranchItem) {
          const prevBranchStock = existingBranchItem.currentStock;
          const newBranchStock = prevBranchStock + qty;

          await db
            .update(branchInventory)
            .set({
              currentStock: newBranchStock,
              status: newBranchStock <= 5 ? "LOW_STOCK" : "IN_STOCK",
              lastUpdated: new Date(),
            })
            .where(
              eq(
                branchInventory.branchInventoryId,
                existingBranchItem.branchInventoryId
              )
            );

          // Record branch addition movement
          await db.insert(inventoryMovements).values({
            itemId: item.itemId,
            branchId: order.branchId,
            movementType: "TRANSFER",
            quantity: qty,
            previousBalance: prevBranchStock,
            newBalance: newBranchStock,
            userId: currentUser.id,
            referenceId: `ORDER-#${order.orderId}`,
            reason: `Received fulfillment from central for order #${displayOrderId}`,
          });
        } else {
          // Insert new branch inventory entry
          await db.insert(branchInventory).values({
            branchId: order.branchId,
            itemId: item.itemId,
            currentStock: qty,
            status: qty <= 5 ? "LOW_STOCK" : "IN_STOCK",
            lastUpdated: new Date(),
          });

          await db.insert(inventoryMovements).values({
            itemId: item.itemId,
            branchId: order.branchId,
            movementType: "TRANSFER",
            quantity: qty,
            previousBalance: 0,
            newBalance: qty,
            userId: currentUser.id,
            referenceId: `ORDER-#${order.orderId}`,
            reason: `Initial stock received from order #${displayOrderId}`,
          });
        }
      }
    }

    // Update order status
    const updatePayload: Partial<typeof orders.$inferInsert> = {
      status: nextStatus,
    };

    if (nextStatus === "FULFILLED") {
      updatePayload.fulfilledBy = currentUser.id;
      updatePayload.fulfilledOn = new Date();
    }

    if (body.notes) {
      updatePayload.notes = body.notes.trim();
    }

    const [updatedOrder] = await db
      .update(orders)
      .set(updatePayload)
      .where(eq(orders.orderId, orderId))
      .returning();

    return NextResponse.json({
      message: `Order #${orderId} status updated to ${nextStatus}`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update order status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
