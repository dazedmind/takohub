import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { branches } from "@/app/db/schema";
import { isAuthError, requireAuth, requireRole } from "@/lib/auth-utils";
import type { CreateBranchInput } from "@/lib/types";

export async function GET() {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const allBranches = await db.select().from(branches).orderBy(branches.branchId);

  return NextResponse.json({ branches: allBranches });
}

export async function POST(request: Request) {
  const authResult = await requireRole("ADMIN");
  if (isAuthError(authResult)) return authResult;

  const body = (await request.json()) as CreateBranchInput;

  if (!body.branchName?.trim()) {
    return NextResponse.json({ error: "Branch name is required" }, { status: 400 });
  }

  const [branch] = await db
    .insert(branches)
    .values({
      branchName: body.branchName.trim(),
      address: body.address?.trim() || null,
    })
    .returning();

  return NextResponse.json({ branch }, { status: 201 });
}
