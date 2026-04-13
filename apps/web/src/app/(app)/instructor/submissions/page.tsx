"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList, Search, X, Github, FileText,
  CheckCircle2, Clock, AlertCircle, RefreshCw,
} from "lucide-react";
import { instructorApi, ApiError, type SubmissionQueueItem } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";
import { SubmissionStatusBadge } from "@/components/submissions/SubmissionStatus";
import { formatDate, formatDateTime } from "@/lib/date-utils";

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
  const router = useRouter();
  const [items, setItems] = useState<SubmissionQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) { router.replace("/login"); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await instructorApi.getSubmissionQueue(
        token,
        courseFilter || undefined,
        statusFilter || undefined
      );
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }, [router, courseFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

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
          <h1 className="text-2xl font-bold text-gray-900">Submission Queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            {pendingCount > 0
              ? `${pendingCount} submission${pendingCount !== 1 ? "s" : ""} awaiting grading`
              : "All submissions graded"}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
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
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-gray-200" />

          {/* Status filter */}
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === s.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search student or assignment…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
      </div>

      {/* Queue table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">No submissions found</p>
          <p className="text-xs text-gray-400">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
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
            <tbody className="divide-y divide-gray-100">
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

                return (
                  <tr key={item.submissionId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.studentName}</p>
                      <p className="text-xs text-gray-400">{item.studentEmail}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="truncate font-medium text-gray-800">{item.assignmentTitle}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {item.courseTitle}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        {item.type === "GitHub" ? (
                          <Github className="h-3.5 w-3.5" />
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                        <span className="text-xs">{item.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <SubmissionStatusBadge status={item.status} />
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
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDateTime(item.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDateTime(item.gradedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/instructor/submissions/${item.submissionId}`}
                        className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
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
