import { db } from "../../../../lib/db";
import { branches } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "../../../../lib/auth-utils";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, "ADMIN");
    const { id } = await context.params;
    const branchId = parseInt(id, 10);
    const { branchName, address } = await request.json();

    if (!branchName) {
      return Response.json({ message: "Branch name is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(branches)
      .set({ branchName, address })
      .where(eq(branches.branchId, branchId))
      .returning();

    return Response.json(updated);
  } catch (error: any) {
    return Response.json({ message: error.message || "Forbidden" }, { status: 403 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return PUT(request, context);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, "ADMIN");
    const { id } = await context.params;
    const branchId = parseInt(id, 10);

    const [deleted] = await db
      .delete(branches)
      .where(eq(branches.branchId, branchId))
      .returning();

    return Response.json(deleted);
  } catch (error: any) {
    return Response.json({ message: error.message || "Forbidden" }, { status: 403 });
  }
}
