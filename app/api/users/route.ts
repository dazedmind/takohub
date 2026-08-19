import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/app/db/auth-schema";
import { isAuthError, requireRole } from "@/lib/auth-utils";
import { hashPassword } from "@/lib/crypto";
import type { CreateUserInput, UserRole } from "@/lib/types";

export async function GET() {
  const authResult = await requireRole("ADMIN");
  if (isAuthError(authResult)) return authResult;

  const usersList = await db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.username, // Maintain email alias for frontend type compatibility
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .orderBy(user.createdAt);

  return NextResponse.json({ users: usersList });
}

export async function POST(request: Request) {
  const authResult = await requireRole("ADMIN");
  if (isAuthError(authResult)) return authResult;

  const body = (await request.json()) as CreateUserInput;

  const userIdentifier = (body.email || (body as any).username || "").trim();

  if (!body.name?.trim() || !userIdentifier || !body.password) {
    return NextResponse.json(
      { error: "Name, username, and password are required" },
      { status: 400 },
    );
  }

  const role: UserRole = body.role ?? "BS";

  try {
    const userId = crypto.randomUUID();
    const hashedPassword = await hashPassword(body.password);

    // Insert user record
    await db.insert(user).values({
      id: userId,
      name: body.name.trim(),
      username: userIdentifier.toLowerCase(),
      password: hashedPassword,
      role,
    });

    const [createdUser] = await db
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
      .where(eq(user.id, userId));

    return NextResponse.json({ user: createdUser }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
