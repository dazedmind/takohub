import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches, orders, branchInventory } from "@/app/db/schema";
import { isAuthError, requireAuth, requireRole } from "@/lib/auth-utils";
import type { UpdateBranchInput } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const { id } = await context.params;
  const branchId = Number(id);

  if (Number.isNaN(branchId)) {
    return NextResponse.json({ error: "Invalid branch ID" }, { status: 400 });
  }

  const [branch] = await db
    .select()
    .from(branches)
    .where(eq(branches.branchId, branchId));

  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  return NextResponse.json({ branch });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireRole("ADMIN");
  if (isAuthError(authResult)) return authResult;

  const { id } = await context.params;
  const branchId = Number(id);

  if (Number.isNaN(branchId)) {
    return NextResponse.json({ error: "Invalid branch ID" }, { status: 400 });
  }

  const body = (await request.json()) as UpdateBranchInput;

  const [branch] = await db
    .update(branches)
    .set({
      ...(body.branchName !== undefined && { branchName: body.branchName.trim() }),
      ...(body.address !== undefined && { address: body.address.trim() || null }),
    })
    .where(eq(branches.branchId, branchId))
    .returning();

  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  return NextResponse.json({ branch });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireRole("ADMIN");
  if (isAuthError(authResult)) return authResult;

  const { id } = await context.params;
  const branchId = Number(id);

  if (Number.isNaN(branchId)) {
    return NextResponse.json({ error: "Invalid branch ID" }, { status: 400 });
  }

  try {
    const [deleted] = await db
      .delete(branches)
      .where(eq(branches.branchId, branchId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to delete branch";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
