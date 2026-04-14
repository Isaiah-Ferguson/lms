"use client";

import {
  Clock, Upload, Cog, CheckCircle2, Star, BookOpen, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubmissionStatus as StatusType, SubmissionResponse } from "@/lib/api-client";
import { formatDateTime } from "@/lib/date-utils";

const STATUS_CONFIG: Record<
  StatusType,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  Draft:        { label: "Draft",           icon: Clock,        color: "text-gray-500 dark:text-slate-400",  bg: "bg-gray-100 dark:bg-slate-700" },
  PendingUpload:{ label: "Pending Upload",  icon: Upload,       color: "text-blue-500 dark:text-blue-400",  bg: "bg-blue-50 dark:bg-blue-950/30"  },
  Uploaded:     { label: "Uploaded",        icon: CheckCircle2, color: "text-teal-500 dark:text-teal-400",  bg: "bg-teal-50 dark:bg-teal-950/30"  },
  Processing:   { label: "Processing",      icon: Cog,          color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
  ReadyToGrade: { label: "Ready to Grade",  icon: BookOpen,     color: "text-purple-500 dark:text-purple-400",bg: "bg-purple-50 dark:bg-purple-950/30"},
  Grading:      { label: "Grading",         icon: Star,         color: "text-orange-500 dark:text-orange-400",bg: "bg-orange-50 dark:bg-orange-950/30"},
  Graded:       { label: "Graded",          icon: CheckCircle2, color: "text-green-500 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30" },
  Returned:     { label: "Returned",        icon: RotateCcw,    color: "text-indigo-500 dark:text-indigo-400",bg: "bg-indigo-50 dark:bg-indigo-950/30"},
};

interface SubmissionStatusBadgeProps {
  status: StatusType;
}

export function SubmissionStatusBadge({ status }: SubmissionStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Draft;
  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        cfg.bg,
        cfg.color
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", status === "Processing" && "animate-spin")} />
      {cfg.label}
    </span>
  );
}

interface SubmissionResultCardProps {
  submission: SubmissionResponse;
  onSubmitAnother?: () => void;
}

export function SubmissionResultCard({
  submission,
  onSubmitAnother,
}: SubmissionResultCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            Submission received
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Attempt #{submission.attemptNumber} ·{" "}
            {formatDateTime(submission.createdAt)}
          </p>
        </div>
        <SubmissionStatusBadge status={submission.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-gray-400 dark:text-slate-500">Submission ID</dt>
          <dd className="mt-0.5 font-mono text-xs text-gray-700 dark:text-slate-300 break-all">
            {submission.id}
          </dd>
        </div>
        <div>
          <dt className="text-gray-400 dark:text-slate-500">Type</dt>
          <dd className="mt-0.5 font-medium text-gray-700 dark:text-slate-300">{submission.type}</dd>
        </div>
      </dl>

      {submission.status === "Processing" && (
        <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
          Your submission is being processed. This usually takes under a minute.
        </p>
      )}

      {onSubmitAnother && (
        <button
          type="button"
          onClick={onSubmitAnother}
          className="mt-5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
        >
          Submit another attempt →
        </button>
      )}
    </div>
  );
}
