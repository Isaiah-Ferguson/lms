import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/utils";
import { TOKEN_COOKIE, REFRESH_COOKIE } from "@/lib/auth-cookies";
import { setSessionCookies, type BackendAuthTokens } from "@/lib/session-cookies";

// Forwards browser API calls to the backend with the bearer token taken from
// the httpOnly session cookie, so the token never has to be readable by JS.
// When the access token has expired mid-session, a one-shot refresh + retry
// keeps the request alive without the client noticing.
// File uploads/downloads and video streaming do NOT pass through here — they
// go directly to Azure Blob Storage via short-lived SAS URLs.
export const dynamic = "force-dynamic";

async function tryRefresh(refreshToken: string): Promise<BackendAuthTokens | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as BackendAuthTokens;
  } catch {
    return null;
  }
}

async function callBackend(
  req: NextRequest,
  url: string,
  token: string | undefined,
  body: ArrayBuffer | undefined
): Promise<Response> {
  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(url, {
    method: req.method,
    headers,
    body,
    cache: "no-store",
  });
}

async function forward(req: NextRequest, { params }: { params: { path: string[] } }) {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  const url = `${API_BASE}/${params.path.join("/")}${req.nextUrl.search}`;
  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();

  let res = await callBackend(req, url, token, body);

  // Access token expired mid-session: refresh once and retry.
  let refreshedTokens: BackendAuthTokens | null = null;
  if (res.status === 401 && refreshToken) {
    refreshedTokens = await tryRefresh(refreshToken);
    if (refreshedTokens) {
      res = await callBackend(req, url, refreshedTokens.accessToken, body);
    }
  }

  const responseHeaders = new Headers();
  for (const name of ["content-type", "content-disposition"]) {
    const value = res.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  const response = new NextResponse(res.body, { status: res.status, headers: responseHeaders });
  if (refreshedTokens) setSessionCookies(response, refreshedTokens);
  return response;
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
