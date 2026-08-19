import { db } from "../../../../lib/db";
import { and, eq } from "drizzle-orm";
import { sessionLog, branches } from "../../../db/schema";
import { requireAuth } from "../../../../lib/auth-utils";

export async function GET(request: Request) {
  try {
    const session = await requireAuth(request);

    // Find active shift for the user
    const activeShifts = await db
      .select({
        sessionId: sessionLog.sessionId,
        userId: sessionLog.userId,
        branchId: sessionLog.branchId,
        branchName: branches.branchName,
        shiftStatus: sessionLog.shiftStatus,
        startShift: sessionLog.startShift,
        selfieUrl: sessionLog.selfieUrl,
      })
      .from(sessionLog)
      .innerJoin(branches, eq(sessionLog.branchId, branches.branchId))
      .where(and(eq(sessionLog.userId, session.id), eq(sessionLog.shiftStatus, "ACTIVE")));

    if (activeShifts.length === 0) {
      return Response.json({ activeShift: null });
    }

    return Response.json({ activeShift: activeShifts[0] });
  } catch (error: any) {
    return Response.json({ message: error.message || "Unauthorized" }, { status: 401 });
  }
}
