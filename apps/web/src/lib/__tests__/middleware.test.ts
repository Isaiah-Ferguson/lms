import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { TOKEN_COOKIE, REFRESH_COOKIE } from "@/lib/auth-cookies";

/**
 * The middleware is the app's routing guard: it decides who reaches /admin and
 * /instructor, and silently refreshes an expired session rather than bouncing
 * the user to login. The API re-authorizes every request independently, so a
 * bug here is a UX/routing failure rather than a breach — but an unguarded
 * /admin route still shows an admin shell to a student.
 */

/** Minimal unsigned JWT — the middleware only decodes, it never verifies. */
function makeToken(role: string, { expired = false } = {}) {
  const exp = Math.floor(Date.now() / 1000) + (expired ? -3600 : 3600);
  const payload = {
    exp,
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": role,
  };
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

function request(path: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(new URL(`https://lms.test${path}`));
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

function locationOf(res: Response) {
  return new URL(res.headers.get("location") ?? "https://lms.test/").pathname;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("middleware — public paths", () => {
  it.each(["/login", "/forgot-password", "/reset-password"])(
    "lets %s through without a session",
    async (path) => {
      const res = await middleware(request(path));
      expect(res.headers.get("location")).toBeNull();
    }
  );

  it("allows the reset-password link with its token query intact", async () => {
    const res = await middleware(request("/reset-password?token=abc123"));
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("middleware — unauthenticated access", () => {
  it("redirects to login when no token is present", async () => {
    const res = await middleware(request("/home"));
    expect(locationOf(res)).toBe("/login");
  });

  it("preserves the attempted path as returnUrl", async () => {
    const res = await middleware(request("/courses/abc"));
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("returnUrl")).toBe("/courses/abc");
  });

  it("redirects when the token is expired and no refresh token exists", async () => {
    const res = await middleware(
      request("/home", { [TOKEN_COOKIE]: makeToken("Student", { expired: true }) })
    );
    expect(locationOf(res)).toBe("/login");
  });
});

describe("middleware — role gates", () => {
  it("keeps a student out of /admin", async () => {
    const res = await middleware(
      request("/admin/participants", { [TOKEN_COOKIE]: makeToken("Student") })
    );
    expect(locationOf(res)).toBe("/home");
  });

  it("keeps an instructor out of /admin", async () => {
    const res = await middleware(
      request("/admin/participants", { [TOKEN_COOKIE]: makeToken("Instructor") })
    );
    expect(locationOf(res)).toBe("/home");
  });

  it("lets an admin into /admin", async () => {
    const res = await middleware(
      request("/admin/participants", { [TOKEN_COOKIE]: makeToken("Admin") })
    );
    expect(res.headers.get("location")).toBeNull();
  });

  it("keeps a student out of /instructor", async () => {
    const res = await middleware(
      request("/instructor/submissions", { [TOKEN_COOKIE]: makeToken("Student") })
    );
    expect(locationOf(res)).toBe("/home");
  });

  it.each(["Instructor", "Admin"])("lets %s into /instructor", async (role) => {
    const res = await middleware(
      request("/instructor/submissions", { [TOKEN_COOKIE]: makeToken(role) })
    );
    expect(res.headers.get("location")).toBeNull();
  });

  it("lets a student reach ordinary app routes", async () => {
    const res = await middleware(
      request("/home", { [TOKEN_COOKIE]: makeToken("Student") })
    );
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("middleware — silent refresh", () => {
  it("refreshes an expired token and continues the request", async () => {
    const fresh = makeToken("Student");
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: fresh,
          refreshToken: "new-refresh",
          expiresIn: 1800,
          refreshExpiresIn: 1209600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const res = await middleware(
      request("/home", {
        [TOKEN_COOKIE]: makeToken("Student", { expired: true }),
        [REFRESH_COOKIE]: "old-refresh",
      })
    );

    expect(fetch).toHaveBeenCalledOnce();
    expect(res.headers.get("location")).toBeNull();
    // The refreshed pair is written back to the browser.
    expect(res.cookies.get(TOKEN_COOKIE)?.value).toBe(fresh);
    expect(res.cookies.get(REFRESH_COOKIE)?.value).toBe("new-refresh");
  });

  it("redirects to login when the refresh is rejected", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 401 }));

    const res = await middleware(
      request("/home", {
        [TOKEN_COOKIE]: makeToken("Student", { expired: true }),
        [REFRESH_COOKIE]: "stale-refresh",
      })
    );

    expect(locationOf(res)).toBe("/login");
  });

  it("redirects to login when the refresh call throws", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));

    const res = await middleware(
      request("/home", {
        [TOKEN_COOKIE]: makeToken("Student", { expired: true }),
        [REFRESH_COOKIE]: "stale-refresh",
      })
    );

    expect(locationOf(res)).toBe("/login");
  });

  it("applies role gates using the refreshed token, not the expired one", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: makeToken("Student"),
          refreshToken: "new-refresh",
          expiresIn: 1800,
          refreshExpiresIn: 1209600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const res = await middleware(
      request("/admin/participants", {
        [TOKEN_COOKIE]: makeToken("Admin", { expired: true }),
        [REFRESH_COOKIE]: "old-refresh",
      })
    );

    // The refreshed token says Student, so the stale Admin claim must not win.
    expect(locationOf(res)).toBe("/home");
  });
});
