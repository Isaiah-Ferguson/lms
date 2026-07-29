"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for failures in the root layout itself, where the normal
 * error boundary can't render. Must supply its own <html>/<body>, and cannot
 * rely on app providers — so the styling here is deliberately self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled root error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div style={{ maxWidth: "28rem", padding: "1.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.75rem" }}>
            CodeStack LMS is temporarily unavailable
          </h1>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "#475569", margin: "0 0 1.5rem" }}>
            Something went wrong while loading the app. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              borderRadius: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
