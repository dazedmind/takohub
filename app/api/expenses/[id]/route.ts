import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { expenses } from "@/app/db/schema";
import { requireRole } from "@/lib/auth-utils";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, "ADMIN");
    const { id } = await params;
    const expenseId = Number(id);

    if (!expenseId || isNaN(expenseId)) {
      return Response.json({ error: "Invalid expense ID" }, { status: 400 });
    }

    const body = await request.json();
    const updateData: Partial<typeof expenses.$inferInsert> = {};

    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (isNaN(amount) || amount <= 0) {
        return Response.json({ error: "Amount must be a positive number" }, { status: 400 });
      }
      updateData.amount = Math.round(amount);
    }

    if (body.category !== undefined) {
      const category = String(body.category).trim();
      if (!category) {
        return Response.json({ error: "Category cannot be empty" }, { status: 400 });
      }
      updateData.category = category;
    }

    if (body.description !== undefined) {
      updateData.description = body.description ? String(body.description).trim() : null;
    }

    if (body.branchId !== undefined) {
      updateData.branchId = body.branchId ? Number(body.branchId) : null;
    }

    if (body.date !== undefined) {
      updateData.date = new Date(body.date);
    }

    const [updated] = await db
      .update(expenses)
      .set(updateData)
      .where(eq(expenses.expenseId, expenseId))
      .returning();

    if (!updated) {
      return Response.json({ error: "Expense not found" }, { status: 404 });
    }

    return Response.json(updated);
  } catch (error: any) {
    console.error("PUT /api/expenses/[id] error:", error);
    return Response.json(
      { error: error.message || "Forbidden" },
      { status: error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, "ADMIN");
    const { id } = await params;
    const expenseId = Number(id);

    if (!expenseId || isNaN(expenseId)) {
      return Response.json({ error: "Invalid expense ID" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(expenses)
      .where(eq(expenses.expenseId, expenseId))
      .returning();

    if (!deleted) {
      return Response.json({ error: "Expense not found" }, { status: 404 });
    }

    return Response.json({ success: true, message: "Expense deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/expenses/[id] error:", error);
    return Response.json(
      { error: error.message || "Forbidden" },
      { status: error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
