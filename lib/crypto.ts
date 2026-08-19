import crypto from "crypto";
import * as jose from "jose";

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

export async function hashPassword(password: string): Promise<string> {
  // Use scryptSync to avoid callback/libuv thread pool issues in serverless runtimes
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 2) {
    return false;
  }
  const [saltHex, keyHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  
  // Use scryptSync to run synchronously in the active thread to prevent hangs in workerd
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    return derivedKey.toString("hex") === keyHex;
  } catch (err) {
    console.error("verifyPassword error:", err);
    return false;
  }
}
