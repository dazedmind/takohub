import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionLog, sales } from "@/app/db/schema";
import { requireAuth, isAuthError } from "@/lib/auth-utils";
import {
  calculatePlatesSold,
  calculateTotalSales,
  calculateSalary,
  calculateRunningDuration,
} from "@/lib/business-logic";
import type { EndShiftSalesInput } from "@/lib/types";

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const user = authResult.user;

  try {
    const body = (await request.json()) as EndShiftSalesInput & {
      eodReport?: string;
    };

    if (!body.sessionId) {
      return NextResponse.json(
        { error: "Active shift session ID is required" },
        { status: 400 }
      );
    }

    // Verify session exists and is ACTIVE
    const shift = await db.query.sessionLog.findFirst({
      where: and(
        eq(sessionLog.sessionId, body.sessionId),
        eq(sessionLog.shiftStatus, "ACTIVE")
      ),
    });

    if (!shift) {
      return NextResponse.json(
        { error: "Active shift session not found or already completed" },
        { status: 404 }
      );
    }

    // Only the employee who started the shift or ADMIN can end it
    if (user.role !== "ADMIN" && shift.userId !== user.id) {
      return NextResponse.json(
        { error: "You cannot end another employee's shift" },
        { status: 403 }
      );
    }

    const endTime = new Date();
    const duration = calculateRunningDuration(shift.startShift, endTime);

    // If Inventory Manager or Admin ending shift with EOD Report (no sales)
    const isIM = user.role === "IM";
    const reportText = body.eodReport?.trim() || body.trashLeftover?.trim() || "";

    const cheese = isIM ? 0 : Math.max(0, Number(body.cheese) || 0);
    const octobits = isIM ? 0 : Math.max(0, Number(body.octobits) || 0);
    const crab = isIM ? 0 : Math.max(0, Number(body.crab) || 0);
    const totalPlates = isIM ? 0 : calculatePlatesSold({ cheese, octobits, crab });
    const totalSales = isIM ? 0 : calculateTotalSales(totalPlates);
    const salary = isIM ? 0 : calculateSalary(totalPlates);

    const cashOnhand = isIM ? 0 : Math.max(0, Number(body.cashOnhand) || 0);
    const expenses = isIM ? 0 : Math.max(0, Number(body.expenses) || 0);
    const gcashPayment = isIM ? 0 : Math.max(0, Number(body.gcashPayment) || 0);
    const free = isIM ? 0 : Math.max(0, Number(body.free) || 0);
    const shortOver = isIM ? 0 : Number(body.shortOver) || 0;
    const trashLeftover = isIM
      ? reportText ? `EOD Report: ${reportText}` : "EOD Shift Ended"
      : reportText;

    // Record sales log
    const [salesRecord] = await db
      .insert(sales)
      .values({
        sessionId: shift.sessionId,
        userId: shift.userId,
        branchId: shift.branchId,
        date: endTime,
        cheese,
        octobits,
        crab,
        totalPlates,
        totalSales,
        cashOnhand,
        expenses,
        salary,
        gcashPayment,
        free,
        shortOver,
        trashLeftover,
      })
      .returning();

    // Mark shift COMPLETED
    const [completedShift] = await db
      .update(sessionLog)
      .set({
        endShift: endTime,
        durationMinutes: duration.totalMinutes,
        shiftStatus: "COMPLETED",
      })
      .where(eq(sessionLog.sessionId, shift.sessionId))
      .returning();

    return NextResponse.json(
      {
        message: isIM
          ? "Shift ended successfully with EOD Report."
          : "Shift ended successfully with complete Sales Log.",
        shift: completedShift,
        sales: salesRecord,
        duration: duration.formattedString,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("End shift error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to end shift";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
