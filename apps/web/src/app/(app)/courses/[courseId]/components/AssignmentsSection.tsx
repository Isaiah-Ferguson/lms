"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { clsx } from "clsx";
import { assignmentsApi, type AssignmentListItem } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import type { LevelAssignment, LevelData } from "./level-dashboard-types";

const COL_META: {
  key: keyof LevelData["assignments"];
  label: string;
  accent: string;
  badge: string;
}[] = [
    { key: "miniChallenges", label: "Mini Challenges", accent: "bg-violet-500", badge: "bg-violet-100 text-violet-700" },
    { key: "challenges", label: "Challenges", accent: "bg-brand-500", badge: "bg-brand-100 text-brand-700" },
    { key: "projects", label: "Projects", accent: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  ];

export function AssignmentsSection({
  courseId,
  canEdit,
  onCreateClick,
}: {
  courseId: string;
  canEdit: boolean;
  onCreateClick?: () => void;
}) {
  const [assignments, setAssignments] = useState<LevelData["assignments"]>({ miniChallenges: [], challenges: [], projects: [] });

  useEffect(() => {
    const token = getToken();
    if (!token || !courseId) return;
    assignmentsApi.getAssignmentsByCourse(courseId, token)
      .then((items: AssignmentListItem[]) => {
        const sorted = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const result: LevelData["assignments"] = { miniChallenges: [], challenges: [], projects: [] };
        for (const a of sorted) {
          const key =
            a.assignmentType === "MiniChallenge" ? "miniChallenges" :
              a.assignmentType === "Project" ? "projects" :
                "challenges";
          result[key].push({
            id: a.id,
            title: a.title,
            type: a.assignmentType as LevelAssignment["type"],
            weekNumber: undefined,
            href: `/courses/${courseId}/assignments/${a.id}`,
          });
        }
        setAssignments(result);
      })
      .catch(() => { });
  }, [courseId]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Assignments</h2>
        {canEdit && onCreateClick && (
          <button
            onClick={onCreateClick}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Assignment
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {COL_META.map(({ key, label, accent, badge }) => (
          <div key={key} className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <div className={clsx("h-1 w-full", accent)} />
            <div className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 px-4 py-2.5">
              <h3 className="text-lg font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</h3>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-slate-700">
              {assignments[key].length === 0 && (
                <li className="px-4 py-4 text-center text-xs text-gray-700 dark:text-slate-400">No assignments yet.</li>
              )}
              {assignments[key].map((a) => (
                <li
                  key={a.id ?? a.title}
                  className="px-4 py-2.5"
                >
                  <Link
                    href={a.href}
                    className="group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400 transition-all duration-150 hover:bg-brand-100 dark:hover:bg-brand-900/40 hover:text-brand-800 dark:hover:text-brand-300 active:bg-brand-200 dark:active:bg-brand-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <span className="flex items-center gap-2">
                      {a.title}

                      {a.weekNumber && (
                        <span
                          className={clsx(
                            "ml-1.5 rounded-full px-1.5 py-0.5 text-[13px] font-semibold",
                            badge
                          )}
                        >
                          W{a.weekNumber}
                        </span>
                      )}
                    </span>

                    {/* arrow */}
                    <span className="opacity-0 translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
