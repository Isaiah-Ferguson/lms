// Validate returnUrl to prevent open redirect vulnerability.
// IMPORTANT: decode first, then validate. Validating the still-encoded value
// lets payloads like "/%2F%2Fevil.com" pass and then decode to "//evil.com".
export function safeReturnUrl(raw: string | null): string | null {
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null; // malformed encoding
  }
  // Only allow same-origin relative paths: must start with a single "/".
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  // Reject backslashes (browsers treat "/\" as protocol-relative) and any
  // protocol marker in the path segment.
  if (decoded.includes("\\")) return null;
  const pathPart = decoded.split(/[?#]/)[0];
  if (pathPart.includes(":")) return null;
  return decoded;
}
