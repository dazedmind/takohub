import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { salaryMatrix } from "@/app/db/schema";
import { requireRole, isAuthError } from "@/lib/auth-utils";
import { DEFAULT_SALARY_MATRIX } from "@/lib/business-logic";

// POST /api/salary/reset - Reset matrix to standard 13 default tiers (Admin/Owner only)
export async function POST(request: Request) {
  const authResult = await requireRole("ADMIN");
  if (isAuthError(authResult)) return authResult;

  try {
    // Delete existing tiers
    await db.delete(salaryMatrix);

    // Re-insert standard default tiers
    await db.insert(salaryMatrix).values(DEFAULT_SALARY_MATRIX);

    const tiers = await db
      .select()
      .from(salaryMatrix)
      .orderBy(asc(salaryMatrix.minPlates));

    return NextResponse.json({
      message: "Salary matrix successfully reset to defaults",
      tiers,
    });
  } catch (error) {
    console.error("Reset salary matrix error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reset salary matrix" },
      { status: 500 }
    );
  }
}
