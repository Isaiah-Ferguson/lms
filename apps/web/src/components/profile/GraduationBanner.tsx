"use client";

import { GraduationCap, FileDown } from "lucide-react";

interface GraduationBannerProps {
  graduatedAt: string | null;
  certificateUrl: string | null;
  certificateFileName: string | null;
}

export function GraduationBanner({ graduatedAt, certificateUrl, certificateFileName }: GraduationBannerProps) {
  const completedOn = graduatedAt
    ? new Date(graduatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="rounded-lg border-2 border-emerald-600 bg-emerald-50 p-4 dark:bg-emerald-950/20">
      <div className="flex items-start gap-3">
        <GraduationCap className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-500" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
            Program Complete
          </h3>
          <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
            Congratulations on completing the program{completedOn ? ` on ${completedOn}` : ""}!
          </p>
          {certificateUrl && (
            <a
              href={certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              View certificate
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
