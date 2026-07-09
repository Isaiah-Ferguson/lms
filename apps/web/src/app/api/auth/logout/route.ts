import { NextResponse } from "next/server";
import { TOKEN_COOKIE, ROLE_COOKIE } from "@/lib/auth-cookies";

// Clears the httpOnly session cookie — client JS cannot remove it itself.
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(TOKEN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(ROLE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
