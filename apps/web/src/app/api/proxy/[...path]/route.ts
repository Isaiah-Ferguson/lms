import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/utils";
import { TOKEN_COOKIE } from "@/lib/auth-cookies";

// Forwards browser API calls to the backend with the bearer token taken from
// the httpOnly session cookie, so the token never has to be readable by JS.
// File uploads/downloads and video streaming do NOT pass through here — they
// go directly to Azure Blob Storage via short-lived SAS URLs.
export const dynamic = "force-dynamic";

async function forward(req: NextRequest, { params }: { params: { path: string[] } }) {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const url = `${API_BASE}/${params.path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  for (const name of ["content-type", "content-disposition"]) {
    const value = res.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new NextResponse(res.body, { status: res.status, headers: responseHeaders });
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
