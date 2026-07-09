import Cookies from "js-cookie";
import { ROLE_COOKIE } from "@/lib/auth-cookies";

// The JWT lives in an httpOnly cookie set by /api/auth/login and is attached
// to backend requests by the /api/proxy route handler — client JS can never
// read it, so an XSS can't exfiltrate the session. The readable role cookie
// is a UX hint only; the backend authorizes every request from the JWT alone.

/**
 * UX-level session marker. Truthy while a session appears active. The value is
 * NOT a real token — it exists so presence checks and api-client signatures
 * keep working; the proxy injects the actual bearer token server-side.
 */
export function getToken(): string | undefined {
  return Cookies.get(ROLE_COOKIE) ? "session" : undefined;
}

/** Ends the session: clears the readable cookie and asks the server to clear the httpOnly one. */
export async function logout(): Promise<void> {
  Cookies.remove(ROLE_COOKIE);
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // The httpOnly cookie expires on its own; middleware also rejects expired tokens.
  }
}

/** Role for UI decisions only (nav items, labels). Never a security boundary. */
export function getUserRole(): string | null {
  return Cookies.get(ROLE_COOKIE) || null;
}
