import crypto from "crypto";
import * as jose from "jose";
import bcrypt from "bcryptjs";

const secretKey = (typeof process !== "undefined" && process.env?.BETTER_AUTH_SECRET)
  ? process.env.BETTER_AUTH_SECRET
  : "default_auth_secret_minimum_32_bytes_long_secret_key";

const SECRET = new TextEncoder().encode(secretKey);

export async function signSessionToken(payload: any): Promise<string> {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<any | null> {
  try {
    const { payload } = await jose.jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export { signSessionToken as signJWT, verifySessionToken as verifyJWT };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, storedHash);
  } catch (err) {
    console.error("verifyPassword error:", err);
    return false;
  }
}
