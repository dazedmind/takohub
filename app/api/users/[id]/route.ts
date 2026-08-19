import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/crypto";
import { db } from "@/lib/db";
import { user } from "@/app/db/auth-schema";
import { isAuthError, requireRole } from "@/lib/auth-utils";
import type { UpdateUserInput } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireRole("ADMIN");
  if (isAuthError(authResult)) return authResult;

  const { id } = await context.params;

  const [foundUser] = await db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.username, // Maintain email alias for frontend compatibility
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, id));

  if (!foundUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: foundUser });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireRole("ADMIN");
  if (isAuthError(authResult)) return authResult;

  const { id } = await context.params;
  const body = (await request.json()) as UpdateUserInput;

  const [existing] = await db.select().from(user).where(eq(user.id, id));

  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userIdentifier = (body.email || (body as any).username);

  await db
    .update(user)
    .set({
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(userIdentifier !== undefined && { username: userIdentifier.trim().toLowerCase() }),
      ...(body.role !== undefined && { role: body.role }),
      updatedAt: new Date(),
    })
    .where(eq(user.id, id));

  if (body.password) {
    const hashedPassword = await hashPassword(body.password);
    await db
      .update(user)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(user.id, id));
  }

  const [updatedUser] = await db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.username, // Maintain email alias for frontend compatibility
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, id));

  return NextResponse.json({ user: updatedUser });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireRole("ADMIN");
  if (isAuthError(authResult)) return authResult;

  const { id } = await context.params;

  if (authResult.user.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const [deleted] = await db.delete(user).where(eq(user.id, id)).returning();

  if (!deleted) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
