import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionLog, sales, salesRemarks } from "@/app/db/schema";
import { requireRole, isAuthError } from "@/lib/auth-utils";

export async function POST(request: Request) {
  const authResult = await requireRole("ADMIN");
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const sessionId = Number(body.sessionId);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json(
        { error: "Valid sessionId is required" },
        { status: 400 }
      );
    }

    // Find the active shift
    const activeShifts = await db
      .select()
      .from(sessionLog)
      .where(and(eq(sessionLog.sessionId, sessionId), eq(sessionLog.shiftStatus, "ACTIVE")));

    if (activeShifts.length === 0) {
      return NextResponse.json(
        { error: "No active shift found with the specified session ID" },
        { status: 404 }
      );
    }

    const activeShift = activeShifts[0];
    const endTime = new Date();
    const startTime = new Date(activeShift.startShift);
    const durationMinutes = Math.max(
      1,
      Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
    );

    // Update shift status to COMPLETED
    await db
      .update(sessionLog)
      .set({
        shiftStatus: "COMPLETED",
        endShift: endTime,
        durationMinutes,
      })
      .where(eq(sessionLog.sessionId, activeShift.sessionId));

    const finalRemarks = reason
      ? `Force ended by Admin: ${reason}`
      : "Force ended by Admin";

    // Check if sales record exists for this shift session
    const existingSales = await db
      .select()
      .from(sales)
      .where(eq(sales.sessionId, activeShift.sessionId));

    if (existingSales.length === 0) {
      // Create empty sales record with remarks so reports have complete data
      await db.insert(sales).values({
        sessionId: activeShift.sessionId,
        userId: activeShift.userId,
        branchId: activeShift.branchId,
        cheese: 0,
        octobits: 0,
        crab: 0,
        totalPlates: 0,
        totalSales: 0,
        cashOnhand: 0,
        expenses: 0,
        salary: 0,
        gcashPayment: 0,
        free: 0,
        shortOver: 0,
        trashLeftover: 0,
        grossSales: 0,
        netSales: 0,
        remarks: finalRemarks,
        date: endTime,
      });
    }

    // Always log administrative action to salesRemarks
    await db.insert(salesRemarks).values({
      sessionId: activeShift.sessionId,
      userId: authResult.id || authResult.user?.id || activeShift.userId,
      remarks: finalRemarks,
      createdAt: endTime,
    });

    return NextResponse.json({
      success: true,
      message: "Shift force ended successfully",
      sessionId: activeShift.sessionId,
    });
  } catch (error) {
    console.error("Force end shift API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to force end shift" },
      { status: 500 }
    );
  }
}
