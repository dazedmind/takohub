import { db } from "../../../../lib/db";
import { eq, and, desc } from "drizzle-orm";
import { sessionLog, branches, sales } from "../../../db/schema";
import { user } from "../../../db/auth-schema";
import { requireAuth } from "../../../../lib/auth-utils";

export async function GET(request: Request) {
  try {
    const session = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    let baseQuery = db
      .select({
        sessionId: sessionLog.sessionId,
        userId: sessionLog.userId,
        userName: user.name,
        userRole: user.role,
        branchId: sessionLog.branchId,
        branchName: branches.branchName,
        shiftStatus: sessionLog.shiftStatus,
        startShift: sessionLog.startShift,
        endShift: sessionLog.endShift,
        durationMinutes: sessionLog.durationMinutes,
        selfieUrl: sessionLog.selfieUrl,
        // Sales fields
        salesId: sales.salesId,
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
      })
      .from(sessionLog)
      .innerJoin(branches, eq(sessionLog.branchId, branches.branchId))
      .innerJoin(user, eq(sessionLog.userId, user.id))
      .leftJoin(sales, eq(sessionLog.sessionId, sales.sessionId));

    // For BS users, only return their own shift history
    if (session.role === "BS") {
      if (type === "sales") {
        const records = await baseQuery
          .where(and(eq(sessionLog.userId, session.id), eq(sessionLog.shiftStatus, "COMPLETED")))
          .orderBy(desc(sessionLog.endShift));
        return Response.json(records);
      } else {
        const records = await baseQuery
          .where(eq(sessionLog.userId, session.id))
          .orderBy(desc(sessionLog.startShift));
        return Response.json(records);
      }
    }

    // For ADMIN and IM, return all
    if (type === "sales") {
      const records = await baseQuery
        .where(eq(sessionLog.shiftStatus, "COMPLETED"))
        .orderBy(desc(sessionLog.endShift));
      return Response.json(records);
    } else {
      const records = await baseQuery.orderBy(desc(sessionLog.startShift));
      return Response.json(records);
    }
  } catch (error: any) {
    return Response.json({ message: error.message || "Unauthorized" }, { status: 401 });
  }
}
