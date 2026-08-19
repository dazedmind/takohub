import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionLog, branches } from "@/app/db/schema";
import { user as userTable } from "@/app/db/auth-schema";
import { requireAuth, isAuthError } from "@/lib/auth-utils";
import { calculateRunningDuration } from "@/lib/business-logic";
import type { ActiveEmployeeShift } from "@/lib/types";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const currentUser = authResult.user;
  const { searchParams } = new URL(request.url);
  const getAll = searchParams.get("all") === "true";

  try {
    // If admin requests all active shifts
    if (currentUser.role === "ADMIN" && getAll) {
      const activeRows = await db
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
        .orderBy(desc(sessionLog.startShift));

      const activeShifts: ActiveEmployeeShift[] = activeRows.map((row) => {
        const duration = calculateRunningDuration(row.startShift);
        return {
          ...row,
          startShift: row.startShift.toISOString(),
          endShift: row.endShift?.toISOString() || null,
          runningTime: duration.formattedString,
        };
      });

      return NextResponse.json({ activeShifts });
    }

    // Get current user's active shift
    const currentShift = await db
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
      .where(
        and(
          eq(sessionLog.userId, currentUser.id),
          eq(sessionLog.shiftStatus, "ACTIVE")
        )
      )
      .limit(1);

    if (currentShift.length === 0) {
      return NextResponse.json({ activeShift: null });
    }

    const shift = currentShift[0];
    const duration = calculateRunningDuration(shift.startShift);

    const activeShift: ActiveEmployeeShift = {
      ...shift,
      startShift: shift.startShift.toISOString(),
      endShift: shift.endShift?.toISOString() || null,
      runningTime: duration.formattedString,
    };

    return NextResponse.json({ activeShift });
  } catch (error) {
    console.error("Get active shift error:", error);
    return NextResponse.json(
      { error: "Failed to fetch active shift information" },
      { status: 500 }
    );
  }
}
