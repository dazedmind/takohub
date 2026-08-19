import { NextResponse } from "next/server";
import { count, eq, gte, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  inventoryItems,
  orders,
  sales,
  sessionLog,
  inventoryMovements,
} from "@/app/db/schema";
import { user as userTable } from "@/app/db/auth-schema";
import { isAuthError, requireAuth } from "@/lib/auth-utils";
import { calculateRunningDuration } from "@/lib/business-logic";
import type { AdminDashboardStats, ActiveEmployeeShift, RecentActivity } from "@/lib/types";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  try {
    // Run all database queries concurrently in parallel via Promise.all
    const [
      dailySalesResult,
      weeklySalesResult,
      inventoryResult,
      branchResult,
      userResult,
      pendingOrdersResult,
      activeRows,
      lowStockItems,
      recentOrders,
      recentSales,
      recentMovements,
    ] = await Promise.all([
      // 1. Daily Sales
      db
        .select({
          revenue: sql<number>`coalesce(sum(${sales.totalSales}), 0)`.mapWith(Number),
          plates: sql<number>`coalesce(sum(${sales.totalPlates}), 0)`.mapWith(Number),
        })
        .from(sales)
        .where(gte(sales.date, todayStart)),

      // 2. Weekly Sales
      db
        .select({
          revenue: sql<number>`coalesce(sum(${sales.totalSales}), 0)`.mapWith(Number),
        })
        .from(sales)
        .where(gte(sales.date, weekStart)),

      // 3. Total Inventory
      db.select({ total: count() }).from(inventoryItems),

      // 4. Total Branches
      db.select({ total: count() }).from(branches),

      // 5. Total Users
      db.select({ total: count() }).from(userTable),

      // 6. Pending Orders
      db
        .select({ total: count() })
        .from(orders)
        .where(eq(orders.status, "PENDING")),

      // 7. Active Shifts
      db
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
        .innerJoin(userTable, eq(sessionLog.userId, userTable.id))
        .innerJoin(branches, eq(sessionLog.branchId, branches.branchId))
        .where(eq(sessionLog.shiftStatus, "ACTIVE"))
        .orderBy(desc(sessionLog.startShift)),

      // 8. Low Stock
      db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.status, "LOW_STOCK"))
        .limit(6),

      // 9. Recent Orders
      db
        .select({
          orderId: orders.orderId,
          status: orders.status,
          createdOn: orders.createdOn,
          branchName: branches.branchName,
        })
        .from(orders)
        .innerJoin(branches, eq(orders.branchId, branches.branchId))
        .orderBy(desc(orders.createdOn))
        .limit(5),

      // 10. Recent Sales
      db
        .select({
          salesId: sales.salesId,
          totalSales: sales.totalSales,
          totalPlates: sales.totalPlates,
          date: sales.date,
          branchName: branches.branchName,
        })
        .from(sales)
        .innerJoin(branches, eq(sales.branchId, branches.branchId))
        .orderBy(desc(sales.date))
        .limit(5),

      // 11. Recent Movements
      db
        .select({
          movementId: inventoryMovements.movementId,
          movementType: inventoryMovements.movementType,
          reason: inventoryMovements.reason,
          createdAt: inventoryMovements.createdAt,
        })
        .from(inventoryMovements)
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(5),
    ]);

    const activeShifts: ActiveEmployeeShift[] = activeRows.map((row) => {
      const duration = calculateRunningDuration(row.startShift);
      return {
        ...row,
        startShift: row.startShift.toISOString(),
        endShift: row.endShift?.toISOString() || null,
        runningTime: duration.formattedString,
      };
    });

    const recentActivity: RecentActivity[] = [
      ...recentOrders.map((order) => {
        const year = order.createdOn ? new Date(order.createdOn).getFullYear() : new Date().getFullYear();
        const paddedId = String(order.orderId).padStart(4, "0");
        return {
          id: `order-${order.orderId}`,
          type: "order" as const,
          description: `Order #${year}-${paddedId} (${order.branchName}) — ${order.status}`,
          timestamp: order.createdOn?.toISOString() ?? new Date().toISOString(),
        };
      }),
      ...recentSales.map((sale) => ({
        id: `sale-${sale.salesId}`,
        type: "sale" as const,
        description: `Sale completed (${sale.branchName}) — ₱${(sale.totalSales ?? 0).toLocaleString()} (${sale.totalPlates} plates)`,
        timestamp: sale.date?.toISOString() ?? new Date().toISOString(),
      })),
      ...recentMovements.map((mov) => ({
        id: `mov-${mov.movementId}`,
        type: "adjustment" as const,
        description: `Stock event: ${mov.reason || mov.movementType}`,
        timestamp: mov.createdAt?.toISOString() ?? new Date().toISOString(),
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 8);

    const stats: AdminDashboardStats = {
      dailyRevenue: dailySalesResult[0]?.revenue ?? 0,
      weeklyRevenue: weeklySalesResult[0]?.revenue ?? 0,
      totalPlatesToday: dailySalesResult[0]?.plates ?? 0,
      totalInventory: inventoryResult[0]?.total ?? 0,
      totalBranches: branchResult[0]?.total ?? 0,
      totalUsers: userResult[0]?.total ?? 0,
      pendingOrders: pendingOrdersResult[0]?.total ?? 0,
      activeEmployeesCount: activeShifts.length,
      activeShifts,
      recentActivity,
      lowStockItems,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to generate dashboard statistics" },
      { status: 500 }
    );
  }
}
