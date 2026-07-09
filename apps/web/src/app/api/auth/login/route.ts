import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/utils";
import { getJwtRole } from "@/lib/jwt";
import { TOKEN_COOKIE, ROLE_COOKIE } from "@/lib/auth-cookies";

// Proxies the login request to the backend and stores the returned JWT in a
// first-party httpOnly cookie so client-side JS can never read it. A separate
// readable role cookie exists purely for UI decisions (nav items, labels);
// the backend authorizes every request from the JWT alone.
export async function POST(req: NextRequest) {
  const body = await req.text();

  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });

  const text = await res.text();

  if (!res.ok) {
    return new NextResponse(text || "{}", {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tokens = JSON.parse(text) as {
    accessToken: string;
    expiresIn: number;
    mustChangePassword: boolean;
  };
  const role = getJwtRole(tokens.accessToken);

  const response = NextResponse.json({
    expiresIn: tokens.expiresIn,
    mustChangePassword: tokens.mustChangePassword,
    role,
  });

  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expiresIn,
  });
  response.cookies.set(ROLE_COOKIE, role ?? "", {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expiresIn,
  });

  return response;
}
