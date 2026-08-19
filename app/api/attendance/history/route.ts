import { NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionLog, branches, sales } from "@/app/db/schema";
import { user as userTable } from "@/app/db/auth-schema";
import { requireAuth, isAuthError } from "@/lib/auth-utils";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const currentUser = authResult.user;
  const { searchParams } = new URL(request.url);

  const branchIdParam = searchParams.get("branchId");
  const userIdParam = searchParams.get("userId");
  const roleParam = searchParams.get("role");
  const statusParam = searchParams.get("status");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  try {
    const conditions = [];

    // Role-based restrictions: BS and IM can only see their own attendance
    if (currentUser.role === "BS" || currentUser.role === "IM") {
      conditions.push(eq(sessionLog.userId, currentUser.id));
    } else {
      if (userIdParam) {
        conditions.push(eq(sessionLog.userId, userIdParam));
      }
      if (roleParam) {
        conditions.push(eq(userTable.role, roleParam as any));
      }
    }

    if (branchIdParam) {
      conditions.push(eq(sessionLog.branchId, Number(branchIdParam)));
    }

    if (statusParam === "ACTIVE" || statusParam === "COMPLETED") {
      conditions.push(eq(sessionLog.shiftStatus, statusParam));
    }

    if (startDateParam) {
      conditions.push(gte(sessionLog.startShift, new Date(startDateParam)));
    }

    if (endDateParam) {
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(sessionLog.startShift, end));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        sessionId: sessionLog.sessionId,
        userId: sessionLog.userId,
        userName: userTable.name,
        userEmail: userTable.username,
        role: userTable.role,
        branchId: sessionLog.branchId,
        branchName: branches.branchName,
        shiftStatus: sessionLog.shiftStatus,
        startShift: sessionLog.startShift,
        endShift: sessionLog.endShift,
        durationMinutes: sessionLog.durationMinutes,
        selfieUrl: sessionLog.selfieUrl,
        createdAt: sessionLog.createdAt,
        // Sales info if completed
        salesId: sales.salesId,
        totalPlates: sales.totalPlates,
        totalSales: sales.totalSales,
        salary: sales.salary,
        cashOnhand: sales.cashOnhand,
        expenses: sales.expenses,
        gcashPayment: sales.gcashPayment,
        free: sales.free,
        shortOver: sales.shortOver,
        trashLeftover: sales.trashLeftover,
      })
      .from(sessionLog)
      .innerJoin(userTable, eq(sessionLog.userId, userTable.id))
      .innerJoin(branches, eq(sessionLog.branchId, branches.branchId))
      .leftJoin(sales, eq(sessionLog.sessionId, sales.sessionId))
      .where(whereClause)
      .orderBy(desc(sessionLog.startShift));

    return NextResponse.json({ records: rows });
  } catch (error) {
    console.error("Attendance history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance history" },
      { status: 500 }
    );
  }
}
