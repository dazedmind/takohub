import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { salaryMatrix } from "@/app/db/schema";
import { requireAuth, requireRole, isAuthError } from "@/lib/auth-utils";
import { DEFAULT_SALARY_MATRIX } from "@/lib/business-logic";
import type { CreateSalaryTierInput } from "@/lib/types";

// GET /api/salary - List all salary tiers (ordered by minPlates ASC)
export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    let tiers = await db
      .select()
      .from(salaryMatrix)
      .orderBy(asc(salaryMatrix.minPlates));

    // If table is empty, seed defaults
    if (tiers.length === 0) {
      await db.insert(salaryMatrix).values(DEFAULT_SALARY_MATRIX);
      tiers = await db
        .select()
        .from(salaryMatrix)
        .orderBy(asc(salaryMatrix.minPlates));
    }

    return NextResponse.json({ tiers });
  } catch (error) {
    console.error("Fetch salary matrix error:", error);
    return NextResponse.json(
      { error: "Failed to fetch salary matrix" },
      { status: 500 }
    );
  }
}

// POST /api/salary - Add a new tier (Admin/Owner only)
export async function POST(request: Request) {
  const authResult = await requireRole("ADMIN");
  if (isAuthError(authResult)) return authResult;

  try {
    const body = (await request.json()) as CreateSalaryTierInput;
    const minPlates = Number(body.minPlates);
    const maxPlates =
      body.maxPlates === null || body.maxPlates === undefined || body.maxPlates === ("" as any)
        ? null
        : Number(body.maxPlates);
    const salary = Number(body.salary);
    const description = body.description?.trim() || null;

    if (isNaN(minPlates) || minPlates < 0) {
      return NextResponse.json(
        { error: "Valid minimum plates is required (0 or greater)" },
        { status: 400 }
      );
    }

    if (maxPlates !== null && (isNaN(maxPlates) || maxPlates < minPlates)) {
      return NextResponse.json(
        { error: "Maximum plates must be greater than or equal to minimum plates" },
        { status: 400 }
      );
    }

    if (isNaN(salary) || salary < 0) {
      return NextResponse.json(
        { error: "Valid salary amount is required (0 or greater)" },
        { status: 400 }
      );
    }

    const [createdTier] = await db
      .insert(salaryMatrix)
      .values({
        minPlates,
        maxPlates,
        salary,
        description,
      })
      .returning();

    return NextResponse.json({ tier: createdTier }, { status: 201 });
  } catch (error) {
    console.error("Create salary tier error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create salary tier" },
      { status: 500 }
    );
  }
}
