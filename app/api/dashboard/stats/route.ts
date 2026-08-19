import { db } from "../../../../lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { sessionLog, orders, inventoryItems, sales, inventoryMovements } from "../../../db/schema";
import { user } from "../../../db/auth-schema";
import { requireRole } from "../../../../lib/auth-utils";

export async function GET(request: Request) {
  try {
    await requireRole(request, "ADMIN", "IM");

    // 1. Active shifts count
    const activeShiftsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessionLog)
      .where(eq(sessionLog.shiftStatus, "ACTIVE"));
    const activeShifts = Number(activeShiftsResult[0]?.count || 0);

    // 2. Pending orders count
    const pendingOrdersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, "PENDING"));
    const pendingOrders = Number(pendingOrdersResult[0]?.count || 0);

    // 3. Low stock/Out of stock items count in Central Inventory
    const lowStockResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(sql`${inventoryItems.status} = 'LOW_STOCK' OR ${inventoryItems.status} = 'OUT_OF_STOCK'`);
    const lowStockItems = Number(lowStockResult[0]?.count || 0);

    // 4. Total sales/revenue (sum of totalSales from sales table)
    const totalSalesResult = await db
      .select({ total: sql<number>`sum(${sales.totalSales})` })
      .from(sales);
    const revenue = Number(totalSalesResult[0]?.total || 0);

    // 5. Recent movements feed
    const movements = await db
      .select({
        movementId: inventoryMovements.movementId,
        itemName: inventoryItems.itemName,
        movementType: inventoryMovements.movementType,
        quantity: inventoryMovements.quantity,
        userName: user.name,
        createdAt: inventoryMovements.createdAt,
      })
      .from(inventoryMovements)
      .innerJoin(inventoryItems, eq(inventoryMovements.itemId, inventoryItems.itemId))
      .innerJoin(user, eq(inventoryMovements.userId, user.id))
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(6);

    return Response.json({
      activeShifts,
      pendingOrders,
      lowStockItems,
      revenue,
      movements,
    });
  } catch (error: any) {
    return Response.json({ message: error.message || "Unauthorized" }, { status: 401 });
  }
}
