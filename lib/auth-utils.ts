import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/crypto";
import type { SessionUser, UserRole } from "@/lib/types";

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) {
    return null;
  }
  const payload = await verifySessionToken(token);
  return payload as SessionUser | null;
}

export { getSessionUser as getSession };

export async function requireAuth(request?: any): Promise<
  { user: SessionUser } | NextResponse
> {
  const user = await getSessionUser();
  const isOriginalApi = request && (request instanceof Request || (typeof request === "object" && "headers" in request));

  if (!user) {
    if (isOriginalApi) {
      throw new Error("Unauthorized");
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { user };
}

export async function requireRole(
  firstArg: any,
  ...restRoles: any[]
): Promise<{ user: SessionUser } | NextResponse> {
  const isOriginalApi = firstArg && (firstArg instanceof Request || (typeof firstArg === "object" && "headers" in firstArg));
  
  let roles: UserRole[] = [];
  if (isOriginalApi) {
    roles = restRoles as UserRole[];
  } else {
    roles = [firstArg, ...restRestArg(restRoles)].filter(Boolean) as UserRole[];
  }

  const result = await requireAuth(isOriginalApi ? { headers: {} } : undefined);

  if (result instanceof NextResponse) {
    if (isOriginalApi) {
      throw new Error("Unauthorized");
    }
    return result;
  }

  if (!roles.includes(result.user.role)) {
    if (isOriginalApi) {
      throw new Error("Forbidden");
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return result;
}

function restRestArg(args: any[]): any[] {
  return args;
}

export function isAuthError(
  result: { user: SessionUser } | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
