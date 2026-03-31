"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface RubricCriterion {
  criterion: string;
  points: number;
  description?: string;
}

export interface RubricScore {
  criterion: string;
  points: number;
  awarded: number;
  comment?: string;
}

interface RubricGraderProps {
  rubricJson: string;
  maxScore: number;
  initialBreakdown?: string;
  onChange: (breakdown: RubricScore[], total: number) => void;
  disabled?: boolean;
}

function parseCriteria(rubricJson: string): RubricCriterion[] {
  try {
    const parsed = JSON.parse(rubricJson);
    if (Array.isArray(parsed)) return parsed as RubricCriterion[];
  } catch {
    // fall through
  }
  return [];
}

function parseBreakdown(json: string): RubricScore[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed as RubricScore[];
  } catch {
    // fall through
  }
  return [];
}

export function RubricGrader({
  rubricJson,
  maxScore,
  initialBreakdown,
  onChange,
  disabled = false,
}: RubricGraderProps) {
  const criteria = parseCriteria(rubricJson);

  const [scores, setScores] = useState<RubricScore[]>(() => {
    if (initialBreakdown) {
      const existing = parseBreakdown(initialBreakdown);
      if (existing.length > 0) return existing;
    }
    return criteria.map((c) => ({
      criterion: c.criterion,
      points: c.points,
      awarded: 0,
      comment: "",
    }));
  });

  useEffect(() => {
    const total = scores.reduce((sum, s) => sum + s.awarded, 0);
    onChange(scores, total);
  }, [scores]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateAwarded(index: number, value: string) {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const capped = Math.min(Math.max(0, num), criteria[index]?.points ?? 0);
    setScores((prev) =>
      prev.map((s, i) => (i === index ? { ...s, awarded: capped } : s))
    );
  }

  function updateComment(index: number, value: string) {
    setScores((prev) =>
      prev.map((s, i) => (i === index ? { ...s, comment: value } : s))
    );
  }

  const totalAwarded = scores.reduce((sum, s) => sum + s.awarded, 0);
  const percentage = maxScore > 0 ? Math.round((totalAwarded / maxScore) * 100) : 0;

  if (criteria.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
        No rubric criteria defined for this assignment.
        <br />
        Enter a total score below.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {criteria.map((c, i) => {
        const score = scores[i];
        const pct = c.points > 0 ? (score?.awarded ?? 0) / c.points : 0;
        return (
          <div
            key={c.criterion}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{c.criterion}</p>
                {c.description && (
                  <p className="mt-0.5 text-xs text-gray-400">{c.description}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={c.points}
                  step={0.5}
                  value={score?.awarded ?? 0}
                  disabled={disabled}
                  onChange={(e) => updateAwarded(i, e.target.value)}
                  className={cn(
                    "w-16 rounded-md border border-gray-300 px-2 py-1 text-right text-sm font-medium",
                    "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                    disabled && "cursor-not-allowed bg-gray-50 opacity-70"
                  )}
                />
                <span className="text-sm text-gray-400">/ {c.points}</span>
              </div>
            </div>

            {/* Mini progress bar */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  pct >= 0.8
                    ? "bg-green-500"
                    : pct >= 0.5
                    ? "bg-amber-400"
                    : "bg-red-400"
                )}
                style={{ width: `${pct * 100}%` }}
              />
            </div>

            <input
              type="text"
              placeholder="Criterion comment (optional)"
              value={score?.comment ?? ""}
              disabled={disabled}
              onChange={(e) => updateComment(i, e.target.value)}
              className={cn(
                "mt-2 w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 placeholder:text-gray-300",
                "focus:border-blue-400 focus:outline-none",
                disabled && "cursor-not-allowed bg-gray-50 opacity-70"
              )}
            />
          </div>
        );
      })}

      {/* Total */}
      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
        <span className="text-sm font-medium text-gray-600">Rubric total</span>
        <span
          className={cn(
            "text-lg font-bold",
            percentage >= 80
              ? "text-green-600"
              : percentage >= 50
              ? "text-amber-600"
              : "text-red-600"
          )}
        >
          {totalAwarded} / {maxScore}
          <span className="ml-1.5 text-sm font-normal text-gray-400">
            ({percentage}%)
          </span>
        </span>
      </div>
    </div>
  );
}
