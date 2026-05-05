"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Search, X, Github, FileText, RefreshCw } from "lucide-react";
import { instructorApi, homeApi, ApiError, type SubmissionQueueItem } from "@/lib/api-client";
import type { AcademicYear } from "@/lib/dashboard-home-data";
import { useAuthedToken } from "@/lib/use-authed-token";
import { Alert } from "@/components/ui/Alert";
import { SubmissionStatusBadge } from "@/components/submissions/SubmissionStatus";
import { formatDateTime, parseApiDate } from "@/lib/date-utils";

const COURSES = [
  { id: "",         name: "All Courses" },
  { id: "combine",  name: "Combine"     },
  { id: "level-1",  name: "Level 1"     },
  { id: "level-2",  name: "Level 2"     },
  { id: "level-3",  name: "Level 3"     },
  { id: "level-4",  name: "Level 4"     },
];

const STATUSES = [
  { id: "",              name: "All Statuses"   },
  { id: "ReadyToGrade",  name: "Ready to Grade" },
  { id: "Graded",        name: "Graded"         },
  { id: "Returned",      name: "Returned"       },
];

export default function SubmissionQueuePage() {
  const token = useAuthedToken();
  const searchParams = useSearchParams();
  const queryYearId = searchParams.get("year");

  const [items, setItems] = useState<SubmissionQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [yearLoaded, setYearLoaded] = useState(false);

  // Load available years and determine selected year
  useEffect(() => {
    if (!token) return;
    const authedToken = token;

    async function loadYears() {
      try {
        const data = await homeApi.getDashboard(authedToken);
        setYears(data.years);

        // Determine which year to use
        const activeYearId = data.years.find((year) => year.isActive)?.id ?? data.years[0]?.id ?? "";
        const preferredYearId = queryYearId && data.years.some((y) => y.id === queryYearId)
          ? queryYearId
          : activeYearId;
        setSelectedYearId(preferredYearId);
      } catch {
        // Silently fail - submissions will still load without year filter
      } finally {
        setYearLoaded(true);
      }
    }
    void loadYears();
  }, [queryYearId, token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await instructorApi.getSubmissionQueue(
        token,
        courseFilter || undefined,
        statusFilter || undefined,
        selectedYearId || undefined
      );
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }, [token, courseFilter, statusFilter, selectedYearId]);

  useEffect(() => { if (yearLoaded) load(); }, [load, yearLoaded]);

  const filtered = search
    ? items.filter(
        (i) =>
          i.studentName.toLowerCase().includes(search.toLowerCase()) ||
          i.studentEmail.toLowerCase().includes(search.toLowerCase()) ||
          i.assignmentTitle.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const pendingCount = items.filter(
    (i) => i.status === "ReadyToGrade" || i.status === "Grading"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Submission Queue</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-700">
            {pendingCount > 0
              ? `${pendingCount} submission${pendingCount !== 1 ? "s" : ""} awaiting grading`
              : "All submissions graded"}
            {selectedYearId && years.length > 0 && (
              <span className="ml-2">
                · {years.find(y => y.id === selectedYearId)?.label || ""}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && <Alert variant="error" message={error} />}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
          {/* Course filter */}
          <div className="flex flex-wrap gap-1.5">
            {COURSES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCourseFilter(c.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  courseFilter === c.id
                    ? "bg-brand-600 text-white"
                    : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-gray-200 dark:bg-slate-700" />

          {/* Status filter */}
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === s.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative ml-auto">
            <label htmlFor="submission-search" className="sr-only">
              Search submissions
            </label>
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              id="submission-search"
              type="text"
              placeholder="Search student or assignment…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 py-1.5 pl-8 pr-8 text-sm focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:focus:ring-brand-400/20"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
      </div>

      {/* Queue table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-slate-700 border-t-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-20 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-gray-500 dark:text-slate-400">No submissions found</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Assignment</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Graded</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {filtered.map((item) => {
                const pct =
                  item.totalScore !== null && item.maxScore > 0
                    ? Math.round((item.totalScore / item.maxScore) * 100)
                    : null;
                const pctColor =
                  pct === null ? "text-gray-400"
                  : pct >= 80 ? "text-emerald-600"
                  : pct >= 60 ? "text-amber-600"
                  : "text-red-600";

                const submittedAt = parseApiDate(item.submittedAt);
                const dueDate     = parseApiDate(item.dueDate);
                const isLate      = !!(submittedAt && dueDate && submittedAt.getTime() > dueDate.getTime());

                return (
                  <tr key={item.submissionId} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-slate-100">{item.studentName}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{item.studentEmail}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="truncate font-medium text-gray-800 dark:text-slate-200">{item.assignmentTitle}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-slate-300">
                        {item.courseTitle}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400">
                        {item.type === "GitHub" ? (
                          <Github className="h-3.5 w-3.5" />
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                        <span className="text-xs">{item.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <SubmissionStatusBadge status={item.status} isLate={isLate} hideLateLabel />
                    </td>
                    <td className="px-4 py-3">
                      {item.totalScore !== null ? (
                        <span className={`font-semibold ${pctColor}`}>
                          {item.totalScore}/{item.maxScore}
                          <span className="ml-1 text-xs font-normal text-gray-400">({pct}%)</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-xs ${isLate ? "font-medium text-red-600 dark:text-red-400" : "text-gray-500 dark:text-slate-400"}`}>
                      {formatDateTime(item.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">
                      {formatDateTime(item.gradedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/instructor/submissions/${item.submissionId}`}
                        className="rounded-lg bg-blue-50 dark:bg-blue-950/30 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        {item.status === "Graded" ? "View / Regrade" : "Grade"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
