import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GradeStatus = "Graded" | "Pending" | "Missing";

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Course level options exposed in admin/instructor grade dashboards.
 * `combine` is a virtual "all courses" bucket handled server-side.
 */
export interface CourseOption {
  id: string;
  name: string;
}

export const COURSES: CourseOption[] = [
  { id: "combine", name: "Combine" },
  { id: "level-1", name: "Level 1" },
  { id: "level-2", name: "Level 2" },
  { id: "level-3", name: "Level 3" },
  { id: "level-4", name: "Level 4" },
];

// ─── Pure helpers ────────────────────────────────────────────────────────────

/** Return the percentage (0-100) earned, or null when no score has been recorded. */
export function pct(score: number | null, max: number): number | null {
  if (score === null || max === 0) return null;
  return Math.round((score / max) * 100);
}

/** Tailwind text-color utility based on a percentage. Null percentages render muted gray. */
export function percentColor(p: number | null): string {
  if (p === null) return "text-gray-400";
  if (p >= 90) return "text-emerald-600";
  if (p >= 70) return "text-blue-600";
  return "text-red-600";
}

/** Convert a percentage to the standard +/- letter grade used across the LMS. */
export function letterGrade(percent: number | null): string {
  if (percent === null) return "—";
  if (percent >= 93) return "A";
  if (percent >= 90) return "A-";
  if (percent >= 87) return "B+";
  if (percent >= 83) return "B";
  if (percent >= 80) return "B-";
  if (percent >= 77) return "C+";
  if (percent >= 73) return "C";
  if (percent >= 70) return "C-";
  if (percent >= 67) return "D+";
  if (percent >= 63) return "D";
  if (percent >= 60) return "D-";
  return "F";
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

/** Pill badge indicating grading state. Dark-mode aware. */
export function statusBadge(status: GradeStatus) {
  if (status === "Graded") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/30 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Graded
      </span>
    );
  }
  if (status === "Missing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/30 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
        <AlertCircle className="h-3 w-3" /> Missing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-950/30 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:text-yellow-400">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}
