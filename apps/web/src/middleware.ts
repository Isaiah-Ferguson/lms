import { NextRequest, NextResponse } from "next/server";
import { isJwtExpired, getJwtRole } from "@/lib/jwt";
import { TOKEN_COOKIE, ROLE_COOKIE } from "@/lib/auth-cookies";

// Server-side route guard: every app route requires a present, unexpired
// session token, and /admin and /instructor sections require the matching
// role. This is a routing/UX layer — the API independently authorizes every
// request from the signed JWT, which remains the security boundary.

const PUBLIC_PATHS = ["/login", "/forgot-password"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(TOKEN_COOKIE)?.value;

  if (!token || isJwtExpired(token)) {
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("returnUrl", pathname + req.nextUrl.search);
    }
    const res = NextResponse.redirect(loginUrl);
    // Drop stale cookies so presence checks don't disagree with the server.
    res.cookies.set(TOKEN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    res.cookies.set(ROLE_COOKIE, "", { path: "/", maxAge: 0 });
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

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, the API routes (login must stay
  // reachable; the proxy does its own token handling), and static files.
  matcher: ["/((?!api|_next/static|_next/image|assets|.*\\.[\\w]+$).*)"],
};
