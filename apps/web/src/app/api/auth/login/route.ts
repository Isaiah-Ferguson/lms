import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/utils";
import { getJwtRole } from "@/lib/jwt";
import { setSessionCookies, type BackendAuthTokens } from "@/lib/session-cookies";

// Proxies the login request to the backend and stores the returned tokens in
// first-party httpOnly cookies so client-side JS can never read them. A
// separate readable role cookie exists purely for UI decisions (nav items,
// labels); the backend authorizes every request from the JWT alone.
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

  const tokens = JSON.parse(text) as BackendAuthTokens;

  const response = NextResponse.json({
    expiresIn: tokens.expiresIn,
    mustChangePassword: tokens.mustChangePassword,
    role: getJwtRole(tokens.accessToken),
  });
  setSessionCookies(response, tokens);

  return response;
}
