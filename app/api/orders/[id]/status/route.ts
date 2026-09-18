import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, getSql } from "@/lib/db";
import { orders } from "@/app/db/schema";
import { requireRole, isAuthError } from "@/lib/auth-utils";
import type { OrderBasketItem, OrderStatus } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Admin, Inventory Manager, or Branch Seller (to receive/complete delivered orders or cancel)
  const authResult = await requireRole("ADMIN", "IM", "BS");
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

    // Role-based status transition validation
    if (currentUser.role === "BS") {
      if (nextStatus === "FULFILLED" && order.status !== "READY") {
        return NextResponse.json(
          { error: "Store branch can only receive orders that are out for delivery (READY)" },
          { status: 400 }
        );
      }
      if (nextStatus !== "FULFILLED" && nextStatus !== "CANCELLED") {
        return NextResponse.json(
          { error: "Branch seller can only receive orders or cancel them" },
          { status: 403 }
        );
      }
    }

    if (nextStatus === "FULFILLED") {
      const sql = getSql();
      const year = order.createdOn ? new Date(order.createdOn).getFullYear() : new Date().getFullYear();
      const paddedId = String(order.orderId).padStart(4, "0");
      const displayOrderId = `${year}-${paddedId}`;

      const rawItems = (order.orderList as OrderBasketItem[]) || [];
      const items = rawItems
        .map((item) => ({
          ...item,
          itemId: Number(item.itemId),
          quantity: Number(item.quantity) || 0,
        }))
        .filter((item) => item.itemId && item.quantity > 0);

      const notesVal = body.notes !== undefined ? body.notes.trim() : (order.notes || "");

      if (items.length === 0) {
        // No items to transfer, just mark fulfilled
        const [updatedOrder] = await db
          .update(orders)
          .set({
            status: "FULFILLED",
            fulfilledBy: currentUser.id,
            fulfilledOn: new Date(),
            notes: notesVal,
          })
          .where(eq(orders.orderId, orderId))
          .returning();

        return NextResponse.json({
          message: `Order #${orderId} status updated to FULFILLED`,
          order: updatedOrder,
        });
      }

      // 1. Bulk query current stock balances for accuracy in movements
      const itemIds = items.map((i) => i.itemId);
      const masterRows = await sql`
        SELECT item_id, central_stock
        FROM inventory_items
        WHERE item_id = ANY(${itemIds});
      `;
      const branchRows = await sql`
        SELECT item_id, current_stock
        FROM branch_inventory
        WHERE branch_id = ${order.branchId} AND item_id = ANY(${itemIds});
      `;

      const masterStockMap = new Map<number, number>();
      for (const row of masterRows) {
        masterStockMap.set(Number(row.item_id), Number(row.central_stock) || 0);
      }

      const branchStockMap = new Map<number, number>();
      for (const row of branchRows) {
        branchStockMap.set(Number(row.item_id), Number(row.current_stock) || 0);
      }

      // 2. Build atomic transaction queries
      const queries: any[] = [];

      for (const item of items) {
        const { itemId, quantity } = item;
        const prevCentral = masterStockMap.get(itemId) ?? 0;
        const newCentral = Math.max(0, prevCentral - quantity);

        const prevBranch = branchStockMap.get(itemId) ?? 0;
        const newBranch = prevBranch + quantity;

        const centralStatus =
          newCentral <= 0 ? "OUT_OF_STOCK" : newCentral <= 10 ? "LOW_STOCK" : "IN_STOCK";
        const branchStatus =
          newBranch <= 0 ? "OUT_OF_STOCK" : newBranch <= 5 ? "LOW_STOCK" : "IN_STOCK";

        // Deduct from Central Stock
        queries.push(sql`
          UPDATE inventory_items
          SET central_stock = GREATEST(0, central_stock - ${quantity}),
              status = ${centralStatus}::stock_status,
              last_updated = NOW()
          WHERE item_id = ${itemId};
        `);

        // Record Central Deduction Movement (branch_id = null for central)
        queries.push(sql`
          INSERT INTO inventory_movements (
            item_id, branch_id, movement_type, quantity,
            previous_balance, new_balance, user_id, reference_id, reason, created_at
          ) VALUES (
            ${itemId}, NULL, 'ORDER_FULFILLED'::movement_type, ${-quantity},
            ${prevCentral}, ${newCentral}, ${currentUser.id}, ${`ORDER-#${order.orderId}`},
            ${`Fulfilled order #${displayOrderId} to Branch ${order.branchId}`}, NOW()
          );
        `);

        // Upsert into Branch Inventory (atomic on conflict update)
        queries.push(sql`
          INSERT INTO branch_inventory (
            branch_id, item_id, current_stock, status, last_updated
          ) VALUES (
            ${order.branchId}, ${itemId}, ${quantity}, ${branchStatus}::stock_status, NOW()
          )
          ON CONFLICT (branch_id, item_id) DO UPDATE
          SET current_stock = branch_inventory.current_stock + ${quantity},
              status = CASE
                WHEN branch_inventory.current_stock + ${quantity} <= 0 THEN 'OUT_OF_STOCK'::stock_status
                WHEN branch_inventory.current_stock + ${quantity} <= 5 THEN 'LOW_STOCK'::stock_status
                ELSE 'IN_STOCK'::stock_status
              END,
              last_updated = NOW();
        `);

        // Record Branch Transfer Movement
        queries.push(sql`
          INSERT INTO inventory_movements (
            item_id, branch_id, movement_type, quantity,
            previous_balance, new_balance, user_id, reference_id, reason, created_at
          ) VALUES (
            ${itemId}, ${order.branchId}, 'TRANSFER'::movement_type, ${quantity},
            ${prevBranch}, ${newBranch}, ${currentUser.id}, ${`ORDER-#${order.orderId}`},
            ${`Received fulfillment from central for order #${displayOrderId}`}, NOW()
          );
        `);
      }

      // Update Order Status to FULFILLED
      queries.push(sql`
        UPDATE orders
        SET status = 'FULFILLED'::order_status,
            fulfilled_by = ${currentUser.id},
            fulfilled_on = NOW(),
            notes = ${notesVal}
        WHERE order_id = ${orderId}
        RETURNING *;
      `);

      // Execute entire batch in a single atomic transaction
      const txResults = await sql.transaction(queries);
      const updatedOrderRows = txResults[txResults.length - 1];
      const updatedOrder = updatedOrderRows[0];

      return NextResponse.json({
        message: `Order #${orderId} status updated to FULFILLED`,
        order: updatedOrder,
      });
    }

    // Update order status for other states (PROCESSING, READY, CANCELLED)
    const updatePayload: Partial<typeof orders.$inferInsert> = {
      status: nextStatus,
    };

    if (body.notes !== undefined) {
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

