import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/utils";
import { REFRESH_COOKIE } from "@/lib/auth-cookies";
import { clearSessionCookies } from "@/lib/session-cookies";

// Revokes the refresh token server-side and clears the httpOnly session
// cookies — client JS cannot remove them itself.
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      });
    } catch {
      // Revocation is best-effort; the cookies are cleared regardless and the
      // refresh token expires on its own.
    }
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
