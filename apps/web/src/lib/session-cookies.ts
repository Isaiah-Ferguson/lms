import type { NextResponse } from "next/server";
import { getJwtRole } from "@/lib/jwt";
import { TOKEN_COOKIE, REFRESH_COOKIE, ROLE_COOKIE } from "@/lib/auth-cookies";

export interface BackendAuthTokens {
  accessToken: string;
  expiresIn: number;
  mustChangePassword: boolean;
  refreshToken: string;
  refreshExpiresIn: number;
}

/**
 * Writes the session cookies onto a route-handler/middleware response:
 * httpOnly access + refresh tokens, plus the readable role hint for the UI.
 */
export function setSessionCookies(response: NextResponse, tokens: BackendAuthTokens): string | null {
  const secure = process.env.NODE_ENV === "production";
  const role = getJwtRole(tokens.accessToken);

  response.cookies.set(TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expiresIn,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    // Only route handlers and middleware ever read this; keep it off page requests…
    // except middleware needs it on page navigations, so it stays site-wide.
    path: "/",
    maxAge: tokens.refreshExpiresIn,
  });
  response.cookies.set(ROLE_COOKIE, role ?? "", {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    // The role hint should outlive the access token so presence checks keep
    // working while the session is silently refreshed.
    maxAge: tokens.refreshExpiresIn,
  });

  return role;
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(TOKEN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(ROLE_COOKIE, "", { path: "/", maxAge: 0 });
}
