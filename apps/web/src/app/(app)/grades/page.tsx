"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, BookOpen, Calendar, Download } from "lucide-react";
import { gradesApi, profileApi, ApiError, type StudentGrades, type Enrollment } from "@/lib/api-client";
import { useAuthedToken } from "@/lib/use-authed-token";
import { Alert } from "@/components/ui/Alert";
import { letterGrade, pct, percentColor, statusBadge } from "@/lib/grade-helpers";

// ─── component ───────────────────────────────────────────────────────────────

export default function GradesPage() {
  const token = useAuthedToken();
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [data, setData] = useState<StudentGrades | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Load user's enrolled courses
  useEffect(() => {
    if (!token) return;

    profileApi.getMyProfile(token)
      .then((profile) => {
        setEnrollments(profile.enrollments);
        // Set the first enrolled course as active if not already set
        if (profile.enrollments.length > 0 && !activeCourseId) {
          setActiveCourseId(profile.enrollments[0].courseId);
        }
      })
      .catch((err) => {
        setError("Failed to load enrolled courses.");
      })
      .finally(() => {
        setLoadingEnrollments(false);
      });
  }, [token]);

  const load = useCallback(async (courseId: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await gradesApi.getMyGrades(courseId, token);
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load grades.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeCourseId) {
      load(activeCourseId);
    }
  }, [activeCourseId, load]);

  const rows = data?.rows ?? [];
  const graded = rows.filter((r) => r.status === "Graded");
  
  // Calculate overall percentage: total points earned / total points possible (graded only)
  const totalPointsEarned = graded.reduce((sum, r) => sum + (r.totalScore ?? 0), 0);
  const totalPointsPossible = graded.reduce((sum, r) => sum + r.maxScore, 0);
  const overallPct = totalPointsPossible > 0
    ? Math.round((totalPointsEarned / totalPointsPossible) * 100)
    : 0;
  
  const lastGradedRow = [...rows].reverse().find((r) => r.gradedAt);

  const exportGrades = () => {
    if (!data) return;
    
    const csvRows = [
      ["Assignment", "Score", "Max Score", "Grade", "Status", "Graded By", "Graded At", "Feedback"],
      ...rows.map(row => {
        const p = pct(row.totalScore, row.maxScore);
        const grade = letterGrade(p);
        return [
          row.assignmentTitle,
          row.totalScore?.toString() ?? "",
          row.maxScore.toString(),
          grade,
          row.status,
          row.gradedBy ?? "",
          row.gradedAt ? new Date(row.gradedAt).toLocaleDateString() : "",
          row.overallComment ?? ""
        ];
      }),
      [],
      ["Course Total", graded.reduce((sum, r) => sum + (r.totalScore ?? 0), 0).toFixed(1), graded.reduce((sum, r) => sum + r.maxScore, 0).toString(), letterGrade(overallPct), `${graded.length} of ${rows.length} graded`, "", "", `${overallPct}% overall`]
    ];

    const csvContent = csvRows.map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${data.courseName}_Grades.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const percentOverTime = graded.map((r) => ({
    label: r.assignmentTitle.length > 14 ? r.assignmentTitle.slice(0, 14) + "…" : r.assignmentTitle,
    percent: pct(r.totalScore, r.maxScore) ?? 0,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">My Grades</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-600">Your submission results and feedback.</p>
      </div>

      {/* Course tabs */}
      <div className="flex flex-wrap gap-2">
        {enrollments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">You are not enrolled in any courses yet.</p>
        ) : (
          enrollments.map((c) => (
            <button
              key={c.courseId}
              onClick={() => setActiveCourseId(c.courseId)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCourseId === c.courseId
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              {c.title}
            </button>
          ))
        )}
      </div>

      {error && <Alert variant="error" message={error} />}

      {loadingEnrollments ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 dark:border-slate-700 border-t-blue-500" />
        </div>
      ) : enrollments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500" />
          <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-slate-100">No Courses Enrolled</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">You are not enrolled in any courses yet. Contact your instructor to get enrolled.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/30">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-300 uppercase tracking-wide font-medium">Overall</p>
                <p className={`text-2xl font-bold ${percentColor(overallPct)}`}>{overallPct}%</p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/30">
                <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-300 uppercase tracking-wide font-medium">Graded</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {graded.length} <span className="text-sm text-gray-400 dark:text-slate-300">/ {rows.length}</span>
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-slate-300 bg-white dark:bg-slate-800 p-5 shadow-sm flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950/30">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-300 uppercase tracking-wide font-medium">Last Graded</p>
                <p className="text-base font-semibold text-gray-900 dark:text-slate-100">
                  {lastGradedRow?.gradedAt
                    ? new Date(lastGradedRow.gradedAt).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Score over time chart */}
          {percentOverTime.length > 1 && (
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-slate-300">Score Over Time</h2>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={percentOverTime} margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip formatter={(v) => typeof v === 'number' ? `${v}%` : "—"} />
                  <Line type="monotone" dataKey="percent" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Grades table */}
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            {rows.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-gray-400 dark:text-slate-500">
                No assignments found for this course.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                    <th className="px-5 py-3">Assignment</th>
                    <th className="px-5 py-3 text-right">Score</th>
                    <th className="px-5 py-3 text-center">Grade</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Graded By</th>
                    <th className="px-5 py-3">Graded At</th>
                    <th className="px-5 py-3">Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {rows.map((row) => {
                    const p = pct(row.totalScore, row.maxScore);
                    const grade = letterGrade(p);
                    return (
                      <tr key={row.assignmentId} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-5 py-3 font-medium text-gray-800 dark:text-slate-300">
                          <Link href={`/courses/${activeCourseId}/assignments/${row.assignmentId}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                            {row.assignmentTitle}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-800 dark:text-slate-300">
                          {row.totalScore !== null ? `${row.totalScore} / ${row.maxScore}` : "—"}
                        </td>
                        <td className={`px-5 py-3 text-center font-bold text-lg ${percentColor(p)}`}>
                          {grade}
                        </td>
                        <td className="px-5 py-3">{statusBadge(row.status)}</td>
                        <td className="px-5 py-3 text-gray-600 dark:text-slate-300 text-sm">
                          {row.gradedBy || "—"}
                        </td>
                        <td className="px-5 py-3 text-gray-500 dark:text-slate-400 text-xs">
                          {row.gradedAt ? new Date(row.gradedAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500 dark:text-slate-400 max-w-xs truncate">
                          {row.overallComment || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50">
                  <tr>
                    <td className="px-5 py-4 font-bold text-gray-900 dark:text-slate-100">Course Total</td>
                    <td className="px-5 py-4 text-right font-bold text-gray-900 dark:text-slate-100">
                      {graded.reduce((sum, r) => sum + (r.totalScore ?? 0), 0).toFixed(1)} / {graded.reduce((sum, r) => sum + r.maxScore, 0)}
                    </td>
                    <td className={`px-5 py-4 text-center font-bold text-2xl ${percentColor(overallPct)}`}>
                      {letterGrade(overallPct)}
                    </td>
                    <td colSpan={4} className="px-5 py-4 text-sm text-gray-500 dark:text-slate-400">
                      {graded.length} of {rows.length} assignments graded • {overallPct}% overall
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Export button */}
          {rows.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={exportGrades}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export Grades
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
