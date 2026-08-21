import { NextResponse } from "next/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { sales, branches, sessionLog } from "@/app/db/schema";
import { user as userTable } from "@/app/db/auth-schema";
import { requireAuth, isAuthError } from "@/lib/auth-utils";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const currentUser = authResult.user;
  const { searchParams } = new URL(request.url);

  const branchIdParam = searchParams.get("branchId");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  try {
    const conditions = [];

    if (currentUser.role === "BS") {
      conditions.push(eq(sales.userId, currentUser.id));
    } else if (branchIdParam) {
      conditions.push(eq(sales.branchId, Number(branchIdParam)));
    }

    if (startDateParam) {
      conditions.push(gte(sales.date, new Date(startDateParam)));
    }

    if (endDateParam) {
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(sales.date, end));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        salesId: sales.salesId,
        sessionId: sales.sessionId,
        userId: sales.userId,
        userName: userTable.name,
        branchId: sales.branchId,
        branchName: branches.branchName,
        date: sales.date,
        cheese: sales.cheese,
        octobits: sales.octobits,
        crab: sales.crab,
        totalPlates: sales.totalPlates,
        totalSales: sales.totalSales,
        cashOnhand: sales.cashOnhand,
        expenses: sales.expenses,
        salary: sales.salary,
        gcashPayment: sales.gcashPayment,
        free: sales.free,
        shortOver: sales.shortOver,
        trashLeftover: sales.trashLeftover,
        grossSales: sales.grossSales,
        netSales: sales.netSales,
        remarks: sales.remarks,
        durationMinutes: sessionLog.durationMinutes,
      })
      .from(sales)
      .innerJoin(userTable, eq(sales.userId, userTable.id))
      .innerJoin(branches, eq(sales.branchId, branches.branchId))
      .leftJoin(sessionLog, eq(sales.sessionId, sessionLog.sessionId))
      .where(whereClause)
      .orderBy(desc(sales.date));

    // Summary totals
    const totalRevenue = rows.reduce((sum, r) => sum + (r.totalSales || 0), 0);
    const totalPlates = rows.reduce((sum, r) => sum + (r.totalPlates || 0), 0);
    const totalSalary = rows.reduce((sum, r) => sum + (r.salary || 0), 0);
    const totalExpenses = rows.reduce((sum, r) => sum + (r.expenses || 0), 0);

    return NextResponse.json({
      sales: rows,
      summary: {
        totalRevenue,
        totalPlates,
        totalSalary,
        totalExpenses,
        recordCount: rows.length,
      },
    });
  } catch (error) {
    console.error("Sales fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales records" },
      { status: 500 }
    );
  }
}
