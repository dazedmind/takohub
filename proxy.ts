import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_ONLY_PATHS = ["/dashboard/users", "/dashboard/branches"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // Optimize prefetch requests to avoid expensive loopback network fetches and DB hits on link hover/scroll
  const isPrefetch =
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("x-middleware-prefetch") === "1";

  if (isPrefetch) {
    const sessionCookie = request.cookies.get("auth_session");

    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  try {
    const sessionResponse = await fetch(new URL("/api/auth/session", request.url), {
      headers: request.headers,
      redirect: "manual",
    });

    if (!sessionResponse.ok) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const data = (await sessionResponse.json()) as {
      session?: {
        user?: {
          role?: string;
        } | null;
      } | null;
    };

    const role = data.session?.user?.role;

    if (ADMIN_ONLY_PATHS.some((path) => pathname.startsWith(path)) && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
