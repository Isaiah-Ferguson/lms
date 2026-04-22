import Cookies from "js-cookie";

const TOKEN_KEY = "cslms_token";

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function setToken(token: string, expiresInSeconds: number): void {
  Cookies.set(TOKEN_KEY, token, {
    expires: expiresInSeconds / 86400,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
}

export function clearToken(): void {
  Cookies.remove(TOKEN_KEY);
}

export function getUserRole(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Try common JWT claim names for role
    return (
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
      payload["role"] ??
      payload["Role"] ??
      null
    );
  } catch {
    return null;
  }
}
