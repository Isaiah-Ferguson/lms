"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Search, X, ChevronUp, ChevronDown, Download } from "lucide-react";
import { gradesApi, homeApi, ApiError, type AdminGrades, type AdminStudentGrade, type StudentGradeRow } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";
import { formatDate, formatDateTime } from "@/lib/date-utils";

const COURSES = [
  { id: "combine", name: "Combine" },
  { id: "level-1", name: "Level 1" },
  { id: "level-2", name: "Level 2" },
  { id: "level-3", name: "Level 3" },
  { id: "level-4", name: "Level 4" },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

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

function pctColor(p: number) {
  if (p >= 90) return "text-emerald-600";
  if (p >= 70) return "text-blue-600";
  return "text-red-600";
}

function GradeCell({ pct, grade }: { pct: number; grade: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`font-semibold ${pctColor(pct)}`}>{pct}%</span>
      <span className={`text-lg font-bold ${pctColor(pct)}`}>{grade}</span>
    </div>
  );
}

function pct(score: number | null, max: number): number {
  if (score === null || max === 0) return 0;
  return Math.round((score / max) * 100);
}

function deriveStats(rows: StudentGradeRow[]) {
  const graded = rows.filter((r) => r.status === "Graded");
  const totalEarned = graded.reduce((s, r) => s + (r.totalScore ?? 0), 0);
  const totalPossible = rows.reduce((s, r) => s + r.maxScore, 0);
  const overallPct = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
  const lastGraded = [...rows].reverse().find((r) => r.gradedAt);
  return {
    overallPct,
    letterGrade: letterGrade(overallPct),
    totalEarned: totalEarned.toFixed(1),
    totalPossible,
    gradedCount: graded.length,
    totalCount: rows.length,
    lastGraded: formatDate(lastGraded?.gradedAt),
  };
}

// ─── sort helpers ─────────────────────────────────────────────────────────────

type SortKey = "name" | "overallPct" | "gradedCount" | "letterGrade";

function SortIcon({ col, active, dir }: { col: SortKey; active: SortKey; dir: "asc" | "desc" }) {
  if (col !== active) return <ChevronUp className="h-3 w-3 text-gray-400 dark:text-slate-500" />;
  return dir === "asc"
    ? <ChevronUp className="h-3 w-3 text-blue-500" />
    : <ChevronDown className="h-3 w-3 text-blue-500" />;
}

// ─── main component ───────────────────────────────────────────────────────────

export default function AdminGradesPage() {
  const router = useRouter();
  const [activeCourseId, setActiveCourseId] = useState(COURSES[0].id);
  const [data, setData] = useState<AdminGrades | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [activeCohortId, setActiveCohortId] = useState<string | null>(null);

  const load = useCallback(async (courseId: string, cohortId: string | null) => {
    const token = getToken();
    if (!token) { router.replace("/login"); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await gradesApi.getAdminGrades(courseId, token, cohortId ?? undefined);
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load grades.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Fetch active cohort on mount
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    homeApi.getDashboard(token)
      .then((dashboard) => {
        const activeCohort = dashboard.years.find(y => y.isActive);
        if (activeCohort) {
          setActiveCohortId(activeCohort.id);
        }
      })
      .catch(() => {
        // Failed to fetch active cohort, will load all grades
      });
  }, []);

  useEffect(() => { 
    if (activeCohortId !== null) {
      load(activeCourseId, activeCohortId); 
    }
  }, [activeCourseId, activeCohortId, load]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const studentsWithStats = useMemo(() =>
    (data?.students ?? []).map((s) => ({ ...s, ...deriveStats(s.rows) })),
    [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return studentsWithStats.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [studentsWithStats, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = sortKey === "name" ? a.name.toLowerCase() : (a as Record<string, unknown>)[sortKey] as number;
      const bv = sortKey === "name" ? b.name.toLowerCase() : (b as Record<string, unknown>)[sortKey] as number;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  // Distribution from live data
  const distribution = useMemo(() => {
    const buckets = [
      { bucket: "90–100", min: 90, max: 101 },
      { bucket: "80–89",  min: 80, max: 90  },
      { bucket: "70–79",  min: 70, max: 80  },
      { bucket: "60–69",  min: 60, max: 70  },
      { bucket: "<60",    min: 0,  max: 60  },
    ];
    return buckets.map(({ bucket, min, max }) => ({
      bucket,
      count: studentsWithStats.filter((s) => s.overallPct >= min && s.overallPct < max).length,
    }));
  }, [studentsWithStats]);

  function Th({ col, children }: { col: SortKey; children: React.ReactNode }) {
    return (
      <th
        className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
        onClick={() => handleSort(col)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          <SortIcon col={col} active={sortKey} dir={sortDir} />
        </span>
      </th>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Admin Grades</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Class-wide grade overview by course.</p>
          </div>
        </div>

        {/* Course tabs */}
        <div className="flex flex-wrap gap-2">
          {COURSES.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveCourseId(c.id); setSearch(""); }}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCourseId === c.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
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
        ) : (
          <>
            {/* Distribution chart */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-slate-300">
                Score Distribution — {data?.courseName}
              </h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={distribution} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => typeof v === 'number' ? `${v} student${v !== 1 ? "s" : ""}` : "—"} />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Search */}
            <div className="relative max-w-xs">
              <label htmlFor="grades-search" className="sr-only">Search students</label>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                id="grades-search"
                type="text"
                placeholder="Search student or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 py-2 pl-9 pr-4 text-sm shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-400/20"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Roster table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              {sorted.length === 0 && !loading ? (
                <div className="px-4 py-12 text-center text-sm text-gray-600 dark:text-slate-400">
                  {studentsWithStats.length === 0 ? "No enrolled students found for this course." : "No students match your search."}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                      <Th col="name">Student</Th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-400">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-400">Score</th>
                      <Th col="overallPct">Grade</Th>
                      <Th col="gradedCount">Graded</Th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-400">Last Graded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {sorted.map((s) => (
                      <tr key={s.userId} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">
                          <Link href={`/admin/participants/${s.userId}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                            {s.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{s.email}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                          {s.totalEarned} / {s.totalPossible}
                        </td>
                        <td className="px-4 py-3">
                          <GradeCell pct={s.overallPct} grade={s.letterGrade} />
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                          {s.gradedCount} <span className="text-gray-500 dark:text-slate-400">/ {s.totalCount}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs">{s.lastGraded}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Export button */}
            {sorted.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (!data) return;
                    // Detailed export with assignment-level grader information
                    const csvRows = [
                      ["Student", "Email", "Assignment", "Assignment Type", "Score", "Max Score", "Percentage", "Status", "Graded By", "Graded At"],
                    ];
                    
                    // Add a row for each student's assignment
                    sorted.forEach(student => {
                      student.rows.forEach(row => {
                        const percentage = row.maxScore > 0 && row.totalScore !== null
                          ? Math.round((row.totalScore / row.maxScore) * 100) + "%"
                          : "—";
                        const gradedAt = formatDateTime(row.gradedAt);
                        
                        csvRows.push([
                          student.name,
                          student.email,
                          row.assignmentTitle,
                          row.assignmentType,
                          row.totalScore?.toString() ?? "—",
                          row.maxScore.toString(),
                          percentage,
                          row.status,
                          row.gradedBy ?? "—",
                          gradedAt
                        ]);
                      });
                    });
                    
                    const csvContent = csvRows.map(row => 
                      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(",")
                    ).join("\n");
                    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                    const link = document.createElement("a");
                    const url = URL.createObjectURL(blob);
                    link.setAttribute("href", url);
                    link.setAttribute("download", `${data.courseName}_Detailed_Grades.csv`);
                    link.style.visibility = "hidden";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
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
    </>
  );
}
