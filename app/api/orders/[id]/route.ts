import { db } from "../../../../lib/db";
import { eq, and } from "drizzle-orm";
import { orders, inventoryItems, branchInventory, inventoryMovements } from "../../../db/schema";
import { requireRole } from "../../../../lib/auth-utils";

function getStockStatus(qty: number): "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK" {
  if (qty <= 0) return "OUT_OF_STOCK";
  if (qty <= 10) return "LOW_STOCK";
  return "IN_STOCK";
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(request, "ADMIN", "IM");
    const { id } = await context.params;
    const orderId = parseInt(id, 10);
    const { status } = await request.json();

    if (!status) {
      return Response.json({ message: "Status is required" }, { status: 400 });
    }

    // Retrieve order
    const orderRecords = await db.select().from(orders).where(eq(orders.orderId, orderId));
    if (orderRecords.length === 0) {
      return Response.json({ message: "Order not found" }, { status: 404 });
    }
    const order = orderRecords[0];

    // If order is already fulfilled or cancelled, don't allow changes
    if (order.status === "FULFILLED" || order.status === "CANCELLED") {
      return Response.json({ message: `Cannot update an order that is already ${order.status}` }, { status: 400 });
    }

    const now = new Date();

    if (status === "FULFILLED") {
      // Process stock transfer from Central Inventory to Branch Inventory
      const orderList = order.orderList as Array<{ itemId: number; itemName: string; unit: string; quantity: number }>;

      for (const item of orderList) {
        const itemRecords = await db.select().from(inventoryItems).where(eq(inventoryItems.itemId, item.itemId));
        if (itemRecords.length > 0) {
          const centralItem = itemRecords[0];

          // 1. Deduct from Central
          const prevCentral = centralItem.centralStock;
          let newCentral = prevCentral - item.quantity;
          if (newCentral < 0) newCentral = 0; // Clamp to 0

          await db
            .update(inventoryItems)
            .set({
              centralStock: newCentral,
              status: getStockStatus(newCentral),
              lastUpdated: now,
            })
            .where(eq(inventoryItems.itemId, item.itemId));

          // Log Central Stock Movement
          await db.insert(inventoryMovements).values({
            itemId: item.itemId,
            branchId: null, // Central
            movementType: "ORDER_FULFILLED",
            quantity: -item.quantity,
            previousBalance: prevCentral,
            newBalance: newCentral,
            userId: session.id,
            referenceId: orderId.toString(),
            reason: `Supply order #${orderId} fulfilled to branch #${order.branchId}`,
            createdAt: now,
          });

          // 2. Add to Branch Stock
          const branchStockRecords = await db
            .select()
            .from(branchInventory)
            .where(and(eq(branchInventory.branchId, order.branchId), eq(branchInventory.itemId, item.itemId)));

          let prevBranch = 0;
          let newBranchStock = 0;

          if (branchStockRecords.length === 0) {
            prevBranch = 0;
            newBranchStock = item.quantity;
            await db.insert(branchInventory).values({
              branchId: order.branchId,
              itemId: item.itemId,
              currentStock: newBranchStock,
              status: getStockStatus(newBranchStock),
              lastUpdated: now,
            });
          } else {
            const currentBranchRecord = branchStockRecords[0];
            prevBranch = currentBranchRecord.currentStock;
            newBranchStock = prevBranch + item.quantity;

            await db
              .update(branchInventory)
              .set({
                currentStock: newBranchStock,
                status: getStockStatus(newBranchStock),
                lastUpdated: now,
              })
              .where(eq(branchInventory.branchInventoryId, currentBranchRecord.branchInventoryId));
          }

          // Log Branch Stock Movement
          await db.insert(inventoryMovements).values({
            itemId: item.itemId,
            branchId: order.branchId,
            movementType: "TRANSFER",
            quantity: item.quantity,
            previousBalance: prevBranch,
            newBalance: newBranchStock,
            userId: session.id,
            referenceId: orderId.toString(),
            reason: `Supply order #${orderId} received from central stock`,
            createdAt: now,
          });
        }
      }

      // Update Order Status to FULFILLED
      const [updatedOrder] = await db
        .update(orders)
        .set({
          status: "FULFILLED",
          fulfilledBy: session.id,
          fulfilledOn: now,
        })
        .where(eq(orders.orderId, orderId))
        .returning();

      return Response.json(updatedOrder);
    } else {
      // Just update status (e.g. PROCESSING, READY, CANCELLED)
      const [updatedOrder] = await db
        .update(orders)
        .set({
          status: status as any,
        })
        .where(eq(orders.orderId, orderId))
        .returning();

      return Response.json(updatedOrder);
    }
  } catch (error: any) {
    console.error("Fulfill Order API error:", error);
    return Response.json({ message: error.message || "Forbidden" }, { status: 403 });
  }
}
