"use client";

import { AlertTriangle } from "lucide-react";

interface ProbationBannerProps {
  reason: string;
}

export function ProbationBanner({ reason }: ProbationBannerProps) {
  return (
    <div className="rounded-lg border-2 border-red-600 bg-red-50 p-4 dark:bg-red-950/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 shrink-0 text-red-600 dark:text-red-500" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
            Academic Probation
          </h3>
          <p className="mt-1 text-sm text-red-800 dark:text-red-200">
            You are currently on academic probation.
            {reason && (
              <>
                {" "}
                <span className="font-medium">Reason:</span> {reason}
              </>
            )}
          </p>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            Please speak with your instructor or an administrator for guidance on improving your academic standing.
          </p>
        </div>
      </div>
    </div>
  );
}
