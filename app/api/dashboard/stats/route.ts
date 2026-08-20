import { db } from "../../../../lib/db";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { sessionLog, orders, inventoryItems, sales, branches } from "../../../db/schema";
import { user as userTable } from "../../../db/auth-schema";
import { requireRole } from "../../../../lib/auth-utils";

export async function GET(request: Request) {
  try {
    await requireRole(request, "ADMIN", "IM");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    // 1. Daily Revenue & Plates Sold
    const dailyStatsResult = await db
      .select({
        revenue: sql<number>`COALESCE(sum(${sales.totalSales}), 0)`,
        plates: sql<number>`COALESCE(sum(${sales.totalPlates}), 0)`
      })
      .from(sales)
      .where(gte(sales.date, todayStart));
    const dailyRevenue = Number(dailyStatsResult[0]?.revenue || 0);
    const totalPlatesToday = Number(dailyStatsResult[0]?.plates || 0);

    // 2. Weekly Revenue
    const weeklyStatsResult = await db
      .select({
        revenue: sql<number>`COALESCE(sum(${sales.totalSales}), 0)`
      })
      .from(sales)
      .where(gte(sales.date, weekStart));
    const weeklyRevenue = Number(weeklyStatsResult[0]?.revenue || 0);

    // 3. Total Counts
    const inventoryCountResult = await db.select({ count: sql<number>`count(*)` }).from(inventoryItems);
    const totalInventory = Number(inventoryCountResult[0]?.count || 0);

    const branchCountResult = await db.select({ count: sql<number>`count(*)` }).from(branches);
    const totalBranches = Number(branchCountResult[0]?.count || 0);

    const userCountResult = await db.select({ count: sql<number>`count(*)` }).from(userTable);
    const totalUsers = Number(userCountResult[0]?.count || 0);

    // 4. Pending Orders
    const pendingOrdersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, "PENDING"));
    const pendingOrders = Number(pendingOrdersResult[0]?.count || 0);

    // 5. Active Shifts & Employees count
    const activeShiftsList = await db
      .select({
        sessionId: sessionLog.sessionId,
        userId: sessionLog.userId,
        userName: userTable.name,
        role: userTable.role,
        branchId: sessionLog.branchId,
        branchName: branches.branchName,
        startShift: sessionLog.startShift,
        endShift: sessionLog.endShift,
        shiftStatus: sessionLog.shiftStatus,
        selfieUrl: sessionLog.selfieUrl,
      })
      .from(sessionLog)
      .innerJoin(branches, eq(sessionLog.branchId, branches.branchId))
      .innerJoin(userTable, eq(sessionLog.userId, userTable.id))
      .where(eq(sessionLog.shiftStatus, "ACTIVE"));

    const activeEmployeesCount = activeShiftsList.length;

    // 6. Low stock items list
    const lowStockItemsList = await db
      .select()
      .from(inventoryItems)
      .where(sql`${inventoryItems.status} = 'LOW_STOCK' OR ${inventoryItems.status} = 'OUT_OF_STOCK'`)
      .limit(10);

    // 7. Recent activity (Map from orders and shifts)
    const recentActivity: any[] = [];
    
    // Fetch recent orders
    const recentOrders = await db
      .select({
        orderId: orders.orderId,
        branchName: branches.branchName,
        createdOn: orders.createdOn,
      })
      .from(orders)
      .innerJoin(branches, eq(orders.branchId, branches.branchId))
      .orderBy(desc(orders.createdOn))
      .limit(3);

    for (const ord of recentOrders) {
      recentActivity.push({
        id: `order_${ord.orderId}`,
        type: "order",
        description: `New order placement from ${ord.branchName}`,
        timestamp: ord.createdOn.toISOString(),
      });
    }

    // Fetch recent sales logs
    const recentSales = await db
      .select({
        salesId: sales.salesId,
        branchName: branches.branchName,
        userName: userTable.name,
        date: sales.date,
        totalSales: sales.totalSales,
      })
      .from(sales)
      .innerJoin(branches, eq(sales.branchId, branches.branchId))
      .innerJoin(userTable, eq(sales.userId, userTable.id))
      .orderBy(desc(sales.date))
      .limit(3);

    for (const s of recentSales) {
      recentActivity.push({
        id: `sale_${s.salesId}`,
        type: "sale",
        description: `${s.userName} submitted EOD Sales Log for ${s.branchName}`,
        timestamp: s.date.toISOString(),
      });
    }

    // Sort recentActivity by timestamp descending
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return Response.json({
      dailyRevenue,
      weeklyRevenue,
      totalPlatesToday,
      totalInventory,
      totalBranches,
      totalUsers,
      pendingOrders,
      activeEmployeesCount,
      activeShifts: activeShiftsList,
      recentActivity: recentActivity.slice(0, 6),
      lowStockItems: lowStockItemsList,
    });
  } catch (error: any) {
    return Response.json({ message: error.message || "Unauthorized" }, { status: 401 });
  }
}
