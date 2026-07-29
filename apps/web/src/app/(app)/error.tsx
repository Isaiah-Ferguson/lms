"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/ErrorState";

/**
 * Catches render and data failures anywhere under the authenticated shell —
 * including the layout's dashboard fetch — so a backend blip shows a recoverable
 * message instead of Next's unstyled crash page.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error in app shell:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 px-6 py-12">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
          Something went wrong
        </h1>
        <p className="mb-6 text-sm text-gray-600 dark:text-slate-400">
          We couldn&apos;t load this page. This is usually temporary.
        </p>

        <ErrorState
          message="The server didn't respond as expected. Try again, and if it keeps happening let your instructor know."
          onRetry={reset}
        />

        <div className="mt-6 text-center">
          <Link
            href="/home"
            className="text-sm font-semibold text-brand-700 dark:text-brand-400 hover:text-brand-900 dark:hover:text-brand-300 transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
