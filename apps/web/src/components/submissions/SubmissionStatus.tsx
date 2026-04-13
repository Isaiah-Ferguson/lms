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
  Draft:        { label: "Draft",           icon: Clock,        color: "text-gray-500",  bg: "bg-gray-100" },
  PendingUpload:{ label: "Pending Upload",  icon: Upload,       color: "text-blue-500",  bg: "bg-blue-50"  },
  Uploaded:     { label: "Uploaded",        icon: CheckCircle2, color: "text-teal-500",  bg: "bg-teal-50"  },
  Processing:   { label: "Processing",      icon: Cog,          color: "text-amber-500", bg: "bg-amber-50" },
  ReadyToGrade: { label: "Ready to Grade",  icon: BookOpen,     color: "text-purple-500",bg: "bg-purple-50"},
  Grading:      { label: "Grading",         icon: Star,         color: "text-orange-500",bg: "bg-orange-50"},
  Graded:       { label: "Graded",          icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
  Returned:     { label: "Returned",        icon: RotateCcw,    color: "text-indigo-500",bg: "bg-indigo-50"},
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
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Submission received
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Attempt #{submission.attemptNumber} ·{" "}
            {formatDateTime(submission.createdAt)}
          </p>
        </div>
        <SubmissionStatusBadge status={submission.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-gray-400">Submission ID</dt>
          <dd className="mt-0.5 font-mono text-xs text-gray-700 break-all">
            {submission.id}
          </dd>
        </div>
        <div>
          <dt className="text-gray-400">Type</dt>
          <dd className="mt-0.5 font-medium text-gray-700">{submission.type}</dd>
        </div>
      </dl>

      {submission.status === "Processing" && (
        <p className="mt-4 text-xs text-amber-600">
          Your submission is being processed. This usually takes under a minute.
        </p>
      )}

      {onSubmitAnother && (
        <button
          type="button"
          onClick={onSubmitAnother}
          className="mt-5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          Submit another attempt →
        </button>
      )}
    </div>
  );
}
