import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { salaryMatrix } from "@/app/db/schema";
import { requireRole, isAuthError } from "@/lib/auth-utils";
import type { UpdateSalaryTierInput } from "@/lib/types";

// PUT /api/salary/[id] - Update a tier (Admin/Owner only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("ADMIN");
  if (isAuthError(authResult)) return authResult;

  const { id } = await params;
  const tierId = Number(id);

  if (!tierId || isNaN(tierId)) {
    return NextResponse.json({ error: "Invalid tier ID" }, { status: 400 });
  }

  try {
    const existing = await db.query.salaryMatrix.findFirst({
      where: eq(salaryMatrix.tierId, tierId),
    });

    if (!existing) {
      return NextResponse.json({ error: "Salary tier not found" }, { status: 404 });
    }

    const body = (await request.json()) as UpdateSalaryTierInput;

    const updatePayload: Partial<typeof salaryMatrix.$inferInsert> = {};

    if (body.minPlates !== undefined) {
      const min = Number(body.minPlates);
      if (isNaN(min) || min < 0) {
        return NextResponse.json(
          { error: "Minimum plates must be a valid number >= 0" },
          { status: 400 }
        );
      }
      updatePayload.minPlates = min;
    }

    if (body.maxPlates !== undefined) {
      if (body.maxPlates === null || body.maxPlates === ("" as any)) {
        updatePayload.maxPlates = null;
      } else {
        const max = Number(body.maxPlates);
        if (isNaN(max)) {
          return NextResponse.json(
            { error: "Maximum plates must be a valid number" },
            { status: 400 }
          );
        }
        const effectiveMin =
          updatePayload.minPlates !== undefined
            ? updatePayload.minPlates
            : existing.minPlates;
        if (max < effectiveMin) {
          return NextResponse.json(
            { error: "Maximum plates must be greater than or equal to minimum plates" },
            { status: 400 }
          );
        }
        updatePayload.maxPlates = max;
      }
    }

    if (body.salary !== undefined) {
      const salary = Number(body.salary);
      if (isNaN(salary) || salary < 0) {
        return NextResponse.json(
          { error: "Salary must be a valid number >= 0" },
          { status: 400 }
        );
      }
      updatePayload.salary = salary;
    }

    if (body.description !== undefined) {
      updatePayload.description = body.description?.trim() || null;
    }

    const [updatedTier] = await db
      .update(salaryMatrix)
      .set(updatePayload)
      .where(eq(salaryMatrix.tierId, tierId))
      .returning();

    return NextResponse.json({ tier: updatedTier });
  } catch (error) {
    console.error("Update salary tier error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update salary tier" },
      { status: 500 }
    );
  }
}

// DELETE /api/salary/[id] - Delete a tier (Admin/Owner only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("ADMIN");
  if (isAuthError(authResult)) return authResult;

  const { id } = await params;
  const tierId = Number(id);

  if (!tierId || isNaN(tierId)) {
    return NextResponse.json({ error: "Invalid tier ID" }, { status: 400 });
  }

  try {
    const existing = await db.query.salaryMatrix.findFirst({
      where: eq(salaryMatrix.tierId, tierId),
    });

    if (!existing) {
      return NextResponse.json({ error: "Salary tier not found" }, { status: 404 });
    }

    await db.delete(salaryMatrix).where(eq(salaryMatrix.tierId, tierId));

    return NextResponse.json({ message: "Salary tier deleted successfully" });
  } catch (error) {
    console.error("Delete salary tier error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete salary tier" },
      { status: 500 }
    );
  }
}
