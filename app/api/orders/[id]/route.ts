import { db, getSql } from "@/lib/db";
import { eq } from "drizzle-orm";
import { orders } from "@/app/db/schema";
import { requireRole } from "@/lib/auth-utils";
import type { OrderBasketItem } from "@/lib/types";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(request, "ADMIN", "IM", "BS");
    const { id } = await context.params;
    const orderId = parseInt(id, 10);
    const body = await request.json();
    const { status, notes } = body;

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

    // Role-based status transition validation
    if (session.role === "BS") {
      if (status === "FULFILLED" && order.status !== "READY") {
        return Response.json(
          { message: "Store branch can only receive orders that are out for delivery (READY)" },
          { status: 400 }
        );
      }
      if (status !== "FULFILLED" && status !== "CANCELLED") {
        return Response.json(
          { message: "Branch seller can only receive orders or cancel them" },
          { status: 403 }
        );
      }
    }

    if (status === "FULFILLED") {
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

      const notesVal = notes !== undefined ? notes.trim() : (order.notes || "");

      if (items.length === 0) {
        const [updatedOrder] = await db
          .update(orders)
          .set({
            status: "FULFILLED",
            fulfilledBy: session.id,
            fulfilledOn: new Date(),
            notes: notesVal,
          })
          .where(eq(orders.orderId, orderId))
          .returning();

        return Response.json(updatedOrder);
      }

      // 1. Bulk query current stock balances
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
            ${prevCentral}, ${newCentral}, ${session.id}, ${`ORDER-#${order.orderId}`},
            ${`Fulfilled order #${displayOrderId} to Branch ${order.branchId}`}, NOW()
          );
        `);

        // Upsert into Branch Inventory
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
            ${prevBranch}, ${newBranch}, ${session.id}, ${`ORDER-#${order.orderId}`},
            ${`Received fulfillment from central for order #${displayOrderId}`}, NOW()
          );
        `);
      }

      // Update Order Status to FULFILLED
      queries.push(sql`
        UPDATE orders
        SET status = 'FULFILLED'::order_status,
            fulfilled_by = ${session.id},
            fulfilled_on = NOW(),
            notes = ${notesVal}
        WHERE order_id = ${orderId}
        RETURNING *;
      `);

      const txResults = await sql.transaction(queries);
      const updatedOrderRows = txResults[txResults.length - 1];
      const updatedOrder = updatedOrderRows[0];

      return Response.json(updatedOrder);
    } else {
      // Just update status (e.g. PROCESSING, READY, CANCELLED)
      const updatePayload: Partial<typeof orders.$inferInsert> = {
        status: status as any,
      };
      if (notes !== undefined) {
        updatePayload.notes = notes.trim();
      }

      const [updatedOrder] = await db
        .update(orders)
        .set(updatePayload)
        .where(eq(orders.orderId, orderId))
        .returning();

      return Response.json(updatedOrder);
    }
  } catch (error: any) {
    console.error("Fulfill Order API error:", error);
    return Response.json({ message: error.message || "Forbidden" }, { status: 403 });
  }
}

