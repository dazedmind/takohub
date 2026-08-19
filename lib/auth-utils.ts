import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/crypto";
import type { SessionUser, UserRole } from "@/lib/types";

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_session")?.value;
  if (!token) {
    return null;
  }
  const payload = await verifySessionToken(token);
  return payload as SessionUser | null;
}

export async function requireAuth(): Promise<
  { user: SessionUser } | NextResponse
> {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { user };
}

export async function requireRole(
  ...roles: UserRole[]
): Promise<{ user: SessionUser } | NextResponse> {
  const result = await requireAuth();

  if (result instanceof NextResponse) {
    return result;
  }

  if (!roles.includes(result.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return result;
}

export function isAuthError(
  result: { user: SessionUser } | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
