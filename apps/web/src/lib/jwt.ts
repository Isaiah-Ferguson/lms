// Minimal JWT payload helpers shared by the middleware and route handlers.
// Decoding here is for UX-level routing decisions only (redirects, nav gating);
// signature verification and real authorization happen on the backend, which
// validates every request's bearer token.

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, skewSeconds = 30): boolean {
  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === "number" ? payload.exp : null;
  if (!exp) return true;
  return exp * 1000 <= Date.now() + skewSeconds * 1000;
}

export function getJwtRole(token: string): string | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const role = payload[ROLE_CLAIM] ?? payload["role"] ?? payload["Role"];
  return typeof role === "string" ? role : null;
}
