import { db } from "../../../../lib/db";
import { user } from "../../../db/auth-schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../../../../lib/crypto";
import { requireRole } from "../../../../lib/auth-utils";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, "ADMIN");
    const { id } = await context.params;
    const { name, role, password } = await request.json();

    if (!name || !role) {
      return Response.json({ message: "Name and role are required" }, { status: 400 });
    }

    const updateData: any = { name, role };
    if (password && password.trim() !== "") {
      updateData.password = await hashPassword(password);
    }

    const [updated] = await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, id))
      .returning({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        updatedAt: user.updatedAt,
      });

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

    // Prevent admin from deleting themselves
    const session = await requireRole(request, "ADMIN");
    if (session.id === id) {
      return Response.json({ message: "You cannot delete yourself" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(user)
      .where(eq(user.id, id))
      .returning({
        id: user.id,
        name: user.name,
      });

    return Response.json(deleted);
  } catch (error: any) {
    return Response.json({ message: error.message || "Forbidden" }, { status: 403 });
  }
}
