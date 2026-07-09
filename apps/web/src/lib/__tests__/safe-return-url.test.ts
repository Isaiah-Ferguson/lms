import { describe, expect, it } from "vitest";
import { safeReturnUrl } from "@/lib/safe-return-url";

describe("safeReturnUrl", () => {
  it("accepts simple same-origin paths", () => {
    expect(safeReturnUrl("/home")).toBe("/home");
    expect(safeReturnUrl("/courses/abc?tab=grades")).toBe("/courses/abc?tab=grades");
  });

  it("rejects null and empty input", () => {
    expect(safeReturnUrl(null)).toBeNull();
    expect(safeReturnUrl("")).toBeNull();
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeReturnUrl("https://evil.com")).toBeNull();
    expect(safeReturnUrl("//evil.com")).toBeNull();
  });

  it("rejects encoded protocol-relative payloads (decode-then-validate)", () => {
    expect(safeReturnUrl("/%2F%2Fevil.com")).toBeNull();
    expect(safeReturnUrl("%2F%2Fevil.com")).toBeNull();
  });

  it("rejects backslash tricks", () => {
    expect(safeReturnUrl("/\\evil.com")).toBeNull();
    expect(safeReturnUrl("/%5Cevil.com")).toBeNull();
  });

  it("rejects protocol markers in the path", () => {
    expect(safeReturnUrl("/javascript:alert(1)")).toBeNull();
  });

  it("allows colons only after ? or #", () => {
    expect(safeReturnUrl("/search?q=a:b")).toBe("/search?q=a:b");
  });

  it("rejects malformed percent-encoding", () => {
    expect(safeReturnUrl("/%E0%A4%A")).toBeNull();
  });
});
