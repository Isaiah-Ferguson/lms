"use client";

import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  /** The error message to display. */
  message: string;
  /** Optional retry handler — renders a "Try again" button when provided. */
  onRetry?: () => void;
  /** Label for the retry button. Defaults to "Try again". */
  retryLabel?: string;
  /** Extra classes for the outer container. */
  className?: string;
}

/**
 * Shared error state: an error alert with an optional retry button,
 * matching the Alert component's error styling (dark-mode aware).
 */
export function ErrorState({ message, onRetry, retryLabel = "Try again", className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300",
        className
      )}
    >
      <div className="flex gap-3">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
        <p className="text-sm">{message}</p>
      </div>
      {onRetry && (
        <div>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {retryLabel}
          </button>
        </div>
      )}
    </div>
  );
}
