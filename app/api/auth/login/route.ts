import { db } from "../../../../lib/db";
import { eq } from "drizzle-orm";
import { user } from "../../../db/auth-schema";
import { hashPassword, signJWT, verifyPassword } from "../../../../lib/crypto";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json({ message: "Username and password are required" }, { status: 400 });
    }

    // Lookup user
    const foundUsers = await db.select().from(user).where(eq(user.username, username.toLowerCase().trim()));
    if (foundUsers.length === 0) {
      return Response.json({ message: "Invalid username or password" }, { status: 401 });
    }

    const foundUser = foundUsers[0];

    // Check password
    const isPasswordMatch = await verifyPassword(password, foundUser.password);
    if (!isPasswordMatch) {
      return Response.json({ message: "Invalid username or password" }, { status: 401 });
    }

    // Sign JWT
    const token = await signJWT({
      id: foundUser.id,
      name: foundUser.name,
      username: foundUser.username,
      role: foundUser.role,
    });

    const userPayload = {
      id: foundUser.id,
      name: foundUser.name,
      username: foundUser.username,
      email: foundUser.username, // Alias
      role: foundUser.role,
    };

    return Response.json(
      { success: true, user: userPayload },
      {
        status: 200,
        headers: {
          "Set-Cookie": `session_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24}`,
        },
      }
    );
  } catch (error: any) {
    console.error("Login API Error:", error);
    return Response.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
