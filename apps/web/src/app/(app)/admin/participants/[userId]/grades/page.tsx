"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { CheckCircle2, Clock, AlertCircle, TrendingUp, BookOpen, Calendar, Download, ArrowLeft } from "lucide-react";
import { gradesApi, homeApi, ApiError, type AdminGrades } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";

type GradeStatus = "Graded" | "Pending" | "Missing";

function statusBadge(status: GradeStatus) {
  if (status === "Graded")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Graded
      </span>
    );
  if (status === "Missing")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
        <AlertCircle className="h-3 w-3" /> Missing
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

function percentColor(p: number | null) {
  if (p === null) return "text-gray-400";
  if (p >= 90) return "text-emerald-600";
  if (p >= 70) return "text-blue-600";
  return "text-red-600";
}

function pct(score: number | null, max: number): number | null {
  if (score === null) return null;
  return Math.round((score / max) * 100);
}

function letterGrade(percent: number | null): string {
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

const COURSES = [
  { id: "combine", name: "Combine" },
  { id: "level-1", name: "Level 1" },
  { id: "level-2", name: "Level 2" },
  { id: "level-3", name: "Level 3" },
  { id: "level-4", name: "Level 4" },
];

export default function StudentGradesPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  
  const [activeCourseId, setActiveCourseId] = useState<string>(COURSES[0].id); // Auto-select first course (Combine)
  const [data, setData] = useState<AdminGrades | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCohortId, setActiveCohortId] = useState<string | null>(null);
  const [cohortLoaded, setCohortLoaded] = useState(false);
  const [studentName, setStudentName] = useState<string>("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setCohortLoaded(true);
      return;
    }
    homeApi.getDashboard(token)
      .then((dashboard) => {
        const activeCohort = dashboard.years.find(y => y.isActive);
        if (activeCohort) {
          setActiveCohortId(activeCohort.id);
        }
      })
      .catch(() => {
        // Failed to fetch active cohort
      })
      .finally(() => {
        setCohortLoaded(true);
      });
  }, []);

  const load = useCallback(async (courseId: string, cohortId: string | null) => {
    const token = getToken();
    if (!token) { router.replace("/login"); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await gradesApi.getAdminGrades(courseId, token, cohortId ?? undefined);
      setData(result);
      
      const student = result.students.find(s => s.userId === userId);
      if (student) {
        setStudentName(student.name);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load grades.");
    } finally {
      setLoading(false);
    }
  }, [router, userId]);

  useEffect(() => {
    if (activeCourseId && cohortLoaded) {
      load(activeCourseId, activeCohortId);
    }
  }, [activeCourseId, cohortLoaded, activeCohortId, load]);

  const student = data?.students.find(s => s.userId === userId);
  const rows = student?.rows ?? [];
  const graded = rows.filter((r) => r.status === "Graded");
  
  const totalPointsEarned = graded.reduce((sum, r) => sum + (r.totalScore ?? 0), 0);
  const totalPointsPossible = graded.reduce((sum, r) => sum + r.maxScore, 0);
  const overallPct = totalPointsPossible > 0
    ? Math.round((totalPointsEarned / totalPointsPossible) * 100)
    : 0;
  
  const lastGradedRow = [...rows].reverse().find((r) => r.gradedAt);

  const exportGrades = () => {
    if (!data || !student) return;
    
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
    link.setAttribute("download", `${studentName}_${data.courseName}_Grades.csv`);
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
      <div className="flex items-center gap-3">
        <Link 
          href={`/admin/participants/${userId}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {studentName ? `${studentName}'s Grades` : "Student Grades"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Viewing student submission results and feedback.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {COURSES.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCourseId(c.id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCourseId === c.id
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {error && <Alert variant="error" message={error} />}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
        </div>
      ) : !student ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-base font-semibold text-gray-900">Student Not Found</h3>
          <p className="mt-2 text-sm text-gray-500">This student is not enrolled in the selected course.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Overall</p>
                <p className={`text-2xl font-bold ${percentColor(overallPct)}`}>{overallPct}%</p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <BookOpen className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Graded</p>
                <p className="text-2xl font-bold text-gray-900">
                  {graded.length} <span className="text-sm text-gray-400">/ {rows.length}</span>
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Last Graded</p>
                <p className="text-base font-semibold text-gray-900">
                  {lastGradedRow?.gradedAt
                    ? new Date(lastGradedRow.gradedAt).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {percentOverTime.length > 1 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">Score Over Time</h2>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={percentOverTime} margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => typeof v === 'number' ? `${v}%` : "—"} />
                  <Line type="monotone" dataKey="percent" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {rows.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-gray-400">
                No assignments found for this course.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <th className="px-5 py-3">Assignment</th>
                    <th className="px-5 py-3 text-right">Score</th>
                    <th className="px-5 py-3 text-center">Grade</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Graded By</th>
                    <th className="px-5 py-3">Graded At</th>
                    <th className="px-5 py-3">Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => {
                    const p = pct(row.totalScore, row.maxScore);
                    const grade = letterGrade(p);
                    return (
                      <tr key={row.assignmentId} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {row.assignmentTitle}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-800">
                          {row.totalScore !== null ? `${row.totalScore} / ${row.maxScore}` : "—"}
                        </td>
                        <td className={`px-5 py-3 text-center font-bold text-lg ${percentColor(p)}`}>
                          {grade}
                        </td>
                        <td className="px-5 py-3">{statusBadge(row.status)}</td>
                        <td className="px-5 py-3 text-gray-600 text-sm">
                          {row.gradedBy || "—"}
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {row.gradedAt ? new Date(row.gradedAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500 max-w-xs truncate">
                          {row.overallComment || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                  <tr>
                    <td className="px-5 py-4 font-bold text-gray-900">Course Total</td>
                    <td className="px-5 py-4 text-right font-bold text-gray-900">
                      {graded.reduce((sum, r) => sum + (r.totalScore ?? 0), 0).toFixed(1)} / {graded.reduce((sum, r) => sum + r.maxScore, 0)}
                    </td>
                    <td className={`px-5 py-4 text-center font-bold text-2xl ${percentColor(overallPct)}`}>
                      {letterGrade(overallPct)}
                    </td>
                    <td colSpan={4} className="px-5 py-4 text-sm text-gray-500">
                      {graded.length} of {rows.length} assignments graded • {overallPct}% overall
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

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
