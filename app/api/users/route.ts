import { db } from "../../../lib/db";
import { user } from "../../db/auth-schema";
import { hashPassword } from "../../../lib/crypto";
import { requireRole } from "../../../lib/auth-utils";

export async function GET(request: Request) {
  try {
    await requireRole(request, "ADMIN");
    // Return all users with their roles (omit password hashes)
    const allUsers = await db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user);
    return Response.json(allUsers);
  } catch (error: any) {
    return Response.json({ message: error.message || "Forbidden" }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, "ADMIN");
    const { name, username, email, password, role } = await request.json();
    const targetUsername = (username || email || "").toLowerCase().trim();

    if (!name || !targetUsername || !password || !role) {
      return Response.json({ message: "All fields are required" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const userId = "usr_" + Math.random().toString(36).substring(2, 10);

    const [newUser] = await db
      .insert(user)
      .values({
        id: userId,
        name,
        username: targetUsername,
        password: hashedPassword,
        role,
      })
      .returning({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      });

    return Response.json(newUser, { status: 201 });
  } catch (error: any) {
    return Response.json({ message: error.message || "Forbidden" }, { status: 403 });
  }
}
