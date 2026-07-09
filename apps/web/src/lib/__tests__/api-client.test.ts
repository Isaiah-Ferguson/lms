import { afterEach, describe, expect, it, vi } from "vitest";
import { authApi, ApiError } from "@/lib/api-client";

function mockFetchOnce(status: number, body: unknown, contentType = "application/json") {
  const response = new Response(
    body === undefined ? null : JSON.stringify(body),
    { status, headers: { "Content-Type": contentType } }
  );
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch error handling (via authApi.forgotPassword)", () => {
  it("returns parsed JSON on success", async () => {
    mockFetchOnce(200, { message: "ok" });

    const result = await authApi.forgotPassword("a@b.com");

    expect(result).toEqual({ message: "ok" });
  });

  it("throws a typed ApiError with the ProblemDetails fields", async () => {
    mockFetchOnce(400, {
      title: "Validation Error",
      detail: "Invalid email or password.",
      errors: ["Invalid email or password."],
    });

    const err = await authApi.forgotPassword("a@b.com").catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.detail).toBe("Invalid email or password.");
    expect(err.errors).toEqual(["Invalid email or password."]);
  });

  it("survives a non-JSON error body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Bad Gateway", { status: 502, statusText: "Bad Gateway" })
      )
    );

    const err = await authApi.forgotPassword("a@b.com").catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(502);
  });

  it("returns undefined for empty 200 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    );

    await expect(authApi.forgotPassword("a@b.com")).resolves.toBeUndefined();
  });
});
