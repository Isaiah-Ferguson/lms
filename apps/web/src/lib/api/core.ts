import { API_BASE } from "@/lib/utils";

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail: string,
    public errors?: string[]
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

// In the browser, requests go through the /api/proxy route handler, which
// injects the bearer token from the httpOnly session cookie — client JS never
// holds the JWT. On the server (layouts, server components) the real token is
// available from cookies() and is attached directly.
const IS_SERVER = typeof window === "undefined";

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (IS_SERVER && token) headers["Authorization"] = `Bearer ${token}`;

  const base = IS_SERVER ? API_BASE : "/api/proxy";
  const res = await fetch(`${base}${path}`, { ...init, headers });

  if (!res.ok) {
    let body: { title?: string; detail?: string; errors?: string[] } = {};
    try {
      body = await res.json();
    } catch {
      // ignore parse errors
    }
    throw new ApiError(
      res.status,
      body.title ?? "Error",
      body.detail ?? res.statusText,
      body.errors
    );
  }

  if (res.status === 204 || res.status === 200) {
    // Check if response has content
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return undefined as T;
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
  return res.json() as Promise<T>;
}
