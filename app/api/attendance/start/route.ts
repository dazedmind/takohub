import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionLog, branches } from "@/app/db/schema";
import { requireAuth, isAuthError } from "@/lib/auth-utils";
import type { StartShiftInput } from "@/lib/types";

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const user = authResult.user;

  try {
    const body = (await request.json()) as StartShiftInput;

    if (!body.branchId) {
      return NextResponse.json(
        { error: "Please select the branch where you are working" },
        { status: 400 }
      );
    }

    if (!body.selfieDataUrl || !body.selfieDataUrl.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Direct camera selfie capture is required to start shift" },
        { status: 400 }
      );
    }

    // Verify branch exists
    const branch = await db.query.branches.findFirst({
      where: eq(branches.branchId, body.branchId),
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Check if user already has an active shift
    const existingActiveShift = await db.query.sessionLog.findFirst({
      where: and(
        eq(sessionLog.userId, user.id),
        eq(sessionLog.shiftStatus, "ACTIVE")
      ),
    });

    if (existingActiveShift) {
      return NextResponse.json(
        {
          error: "You already have an active shift. Please end it before starting a new one.",
          activeShift: existingActiveShift,
        },
        { status: 409 }
      );
    }

    // Create new attendance record
    const [newShift] = await db
      .insert(sessionLog)
      .values({
        userId: user.id,
        branchId: body.branchId,
        shiftStatus: "ACTIVE",
        startShift: new Date(),
        selfieUrl: body.selfieDataUrl,
      })
      .returning();

    return NextResponse.json(
      {
        message: "Shift started successfully",
        shift: {
          ...newShift,
          branchName: branch.branchName,
          userName: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Start shift error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to start shift";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
