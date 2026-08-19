import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/app/db/auth-schema";
import { verifyPassword, signSessionToken } from "@/lib/crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json({ message: "Username and password are required" }, { status: 400 });
    }
    
    const rawIdentifier = username.trim().toLowerCase();
    
    // Find the user matching the exact username directly
    const [foundUser] = await db
      .select()
      .from(user)
      .where(eq(user.username, rawIdentifier))
      .limit(1);
      
    if (!foundUser || !foundUser.password) {
      return NextResponse.json({ message: "Invalid username or password" }, { status: 400 });
    }
    
    // Verify password hash
    const isValid = await verifyPassword(password, foundUser.password);
    if (!isValid) {
      return NextResponse.json({ message: "Invalid username or password" }, { status: 400 });
    }
    
    // Create session payload (retains 'email' alias matching client SessionUser requirements)
    const sessionUser = {
      id: foundUser.id,
      name: foundUser.name,
      username: foundUser.username,
      email: foundUser.username,
      role: foundUser.role,
      createdAt: foundUser.createdAt,
      updatedAt: foundUser.updatedAt,
    };
    
    // Sign session token
    const token = await signSessionToken(sessionUser);
    
    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });
    
    return NextResponse.json({ user: sessionUser });
  } catch (err: any) {
    console.error("Login route error:", err);
    return NextResponse.json({ message: err.message || "An error occurred during login." }, { status: 500 });
  }
}
