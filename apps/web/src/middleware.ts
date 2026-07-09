import { NextRequest, NextResponse } from "next/server";
import { isJwtExpired, getJwtRole } from "@/lib/jwt";
import { TOKEN_COOKIE, REFRESH_COOKIE, ROLE_COOKIE } from "@/lib/auth-cookies";
import { API_BASE } from "@/lib/utils";
import {
  setSessionCookies,
  clearSessionCookies,
  type BackendAuthTokens,
} from "@/lib/session-cookies";

// Server-side route guard: every app route requires a present, unexpired
// session token (silently refreshed when possible), and /admin and
// /instructor sections require the matching role. This is a routing/UX
// layer — the API independently authorizes every request from the signed
// JWT, which remains the security boundary.

const PUBLIC_PATHS = ["/login", "/forgot-password"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  let token = req.cookies.get(TOKEN_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  let refreshedTokens: BackendAuthTokens | null = null;

  // Expired/missing access token but a live refresh token: refresh silently so
  // server components render with a valid token instead of bouncing to login.
  if ((!token || isJwtExpired(token)) && refreshToken) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      });
      if (res.ok) {
        refreshedTokens = (await res.json()) as BackendAuthTokens;
        token = refreshedTokens.accessToken;
      }
    } catch {
      // fall through to the login redirect below
    }
  }

  if (!token || isJwtExpired(token)) {
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("returnUrl", pathname + req.nextUrl.search);
    }
    const res = NextResponse.redirect(loginUrl);
    // Drop stale cookies so presence checks don't disagree with the server.
    clearSessionCookies(res);
    return res;
  }

  const role = getJwtRole(token);

  if (pathname.startsWith("/admin") && role !== "Admin") {
    return NextResponse.redirect(new URL("/home", req.url));
  }
  if (
    pathname.startsWith("/instructor") &&
    role !== "Admin" &&
    role !== "Instructor"
  ) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  if (refreshedTokens) {
    // Rewrite the request's cookie header so server components in THIS request
    // already see the fresh token, and set the new cookies on the response.
    const requestHeaders = new Headers(req.headers);
    const cookieHeader = req.cookies
      .getAll()
      .map((c) =>
        c.name === TOKEN_COOKIE
          ? `${c.name}=${refreshedTokens!.accessToken}`
          : c.name === REFRESH_COOKIE
            ? `${c.name}=${refreshedTokens!.refreshToken}`
            : c.name === ROLE_COOKIE
              ? `${c.name}=${role ?? ""}`
              : `${c.name}=${c.value}`
      )
      .join("; ");
    requestHeaders.set("cookie", cookieHeader);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    setSessionCookies(response, refreshedTokens);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, the API routes (login must stay
  // reachable; the proxy does its own token handling), and static files.
  matcher: ["/((?!api|_next/static|_next/image|assets|.*\\.[\\w]+$).*)"],
};
