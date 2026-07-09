import { describe, expect, it } from "vitest";
import { decodeJwtPayload, getJwtRole, isJwtExpired } from "@/lib/jwt";

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

function makeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.fakesig`;
}

describe("decodeJwtPayload", () => {
  it("decodes a base64url payload", () => {
    const token = makeJwt({ sub: "123", name: "Tügçe" });
    expect(decodeJwtPayload(token)).toMatchObject({ sub: "123" });
  });

  it("returns null for garbage input", () => {
    expect(decodeJwtPayload("not-a-jwt")).toBeNull();
    expect(decodeJwtPayload("")).toBeNull();
    expect(decodeJwtPayload("a.!!!.c")).toBeNull();
  });
});

describe("isJwtExpired", () => {
  it("is false for a future expiry", () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(isJwtExpired(token)).toBe(false);
  });

  it("is true for a past expiry", () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) - 60 });
    expect(isJwtExpired(token)).toBe(true);
  });

  it("is true within the clock-skew window", () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 10 });
    expect(isJwtExpired(token, 30)).toBe(true);
  });

  it("treats a missing exp claim as expired", () => {
    expect(isJwtExpired(makeJwt({ sub: "123" }))).toBe(true);
    expect(isJwtExpired("garbage")).toBe(true);
  });
});

describe("getJwtRole", () => {
  it("reads the .NET role claim", () => {
    const token = makeJwt({ [ROLE_CLAIM]: "Admin" });
    expect(getJwtRole(token)).toBe("Admin");
  });

  it("falls back to plain role claims", () => {
    expect(getJwtRole(makeJwt({ role: "Student" }))).toBe("Student");
    expect(getJwtRole(makeJwt({ Role: "Instructor" }))).toBe("Instructor");
  });

  it("returns null when absent or non-string", () => {
    expect(getJwtRole(makeJwt({ sub: "1" }))).toBeNull();
    expect(getJwtRole(makeJwt({ role: 42 }))).toBeNull();
    expect(getJwtRole("garbage")).toBeNull();
  });
});
