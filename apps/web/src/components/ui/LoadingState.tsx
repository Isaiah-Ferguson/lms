"use client";

import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /** Optional text shown under the spinner. */
  message?: string;
  /** Extra classes for the outer container (e.g. to adjust vertical padding). */
  className?: string;
}

/**
 * Shared centered-spinner loading state, matching the visual language used
 * across the app (bordered ring spinner, dark-mode aware).
 */
export function LoadingState({ message, className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 py-16", className)}
    >
      <div
        aria-hidden="true"
        className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 dark:border-slate-700 border-t-blue-500"
      />
      {message ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">{message}</p>
      ) : (
        <span className="sr-only">Loading…</span>
      )}
    </div>
  );
}
