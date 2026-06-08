"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText, RefreshCw, ChevronRight, AlertCircle, CheckCircle2,
  Clock, Loader2, XCircle, Users, BarChart2, Search, X,
} from "lucide-react";
import {
  reportsApi, ApiError,
  type ProgressReportSummary, type ProgressReportStatus, type StudentOption,
} from "@/lib/api-client";
import { useAuthedToken } from "@/lib/use-authed-token";
import { Alert } from "@/components/ui/Alert";
import { formatDate } from "@/lib/date-utils";

// ─── helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProgressReportStatus }) {
  const map: Record<ProgressReportStatus, { label: string; className: string; Icon: React.ElementType }> = {
    Pending:    { label: "Pending",    className: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300", Icon: Clock },
    Generating: { label: "Generating", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", Icon: Loader2 },
    Generated:  { label: "Generated",  className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", Icon: CheckCircle2 },
    Failed:     { label: "Failed",     className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", Icon: XCircle },
    Published:  { label: "Published",  className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", Icon: CheckCircle2 },
  };
  const { label, className, Icon } = map[status] ?? map.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      <Icon className={`h-3.5 w-3.5 ${status === "Generating" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}

function groupByWeek(reports: ProgressReportSummary[]) {
  const map = new Map<string, ProgressReportSummary[]>();
  for (const r of reports) {
    const week = r.weekOf.split("T")[0];
    if (!map.has(week)) map.set(week, []);
    map.get(week)!.push(r);
  }
  return map;
}

// ─── Student picker modal ─────────────────────────────────────────────────────

function StudentPickerModal({
  students,
  onSelect,
  onClose,
  triggering,
}: {
  students: StudentOption[];
  onSelect: (id: string) => void;
  onClose: () => void;
  triggering: boolean;
}) {
  const [search, setSearch] = useState("");
  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 px-5 py-4">
          <h3 className="font-bold text-gray-900 dark:text-slate-50">Pick a Student</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Search students…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <ul className="max-h-64 overflow-y-auto px-2 pb-3">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-gray-400 dark:text-slate-500">No students found</li>
          ) : filtered.map(s => (
            <li key={s.id}>
              <button
                disabled={triggering}
                onClick={() => onSelect(s.id)}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-800 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700 dark:hover:text-brand-300 transition-colors disabled:opacity-50"
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Report table ─────────────────────────────────────────────────────────────

function ReportTable({ reports }: { reports: ProgressReportSummary[] }) {
  const grouped = groupByWeek(reports);
  const weeks = Array.from(grouped.keys()).sort().reverse();
  const isClass = reports[0]?.reportType === "ClassSummary";

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 py-20 text-center">
        <FileText className="mb-4 h-10 w-10 text-gray-300 dark:text-slate-600" />
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400">No reports yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {weeks.map((week) => {
        const rows = grouped.get(week)!;
        const generated = rows.filter(r => r.status === "Generated" || r.status === "Published").length;
        const failed = rows.filter(r => r.status === "Failed").length;

        return (
          <section key={week}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-base font-bold text-gray-800 dark:text-slate-200">
                Week of {formatDate(week)}
              </h2>
              <span className="text-xs text-gray-400 dark:text-slate-500">
                {generated}/{rows.length} generated{failed > 0 ? ` · ${failed} failed` : ""}
              </span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40">
                    {!isClass && <th className="px-5 py-3 text-left font-semibold text-gray-600 dark:text-slate-400">Student</th>}
                    {isClass  && <th className="px-5 py-3 text-left font-semibold text-gray-600 dark:text-slate-400">Report</th>}
                    <th className="px-5 py-3 text-left font-semibold text-gray-600 dark:text-slate-400">Status</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600 dark:text-slate-400 hidden sm:table-cell">Generated</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600 dark:text-slate-400 hidden md:table-cell">Model</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {rows.map((r) => (
                    <tr key={r.id} className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-slate-100">
                        {isClass ? "Class Summary" : (r.studentName ?? "—")}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={r.status} />
                        {r.failureReason && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                            <AlertCircle className="h-3 w-3" />
                            {r.failureReason.slice(0, 80)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400 hidden sm:table-cell">
                        {r.generatedAt ? formatDate(r.generatedAt) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 dark:text-slate-500 hidden md:table-cell text-xs font-mono">
                        {r.model || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {(r.status === "Generated" || r.status === "Published") && (
                          <Link
                            href={`/admin/reports/${r.id}`}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                          >
                            View <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

type Tab = "student" | "class";

export default function ReportsPage() {
  const token = useAuthedToken();
  const [tab, setTab] = useState<Tab>("student");
  const [reports, setReports] = useState<ProgressReportSummary[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const load = useCallback(async (activeTab: Tab) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [data, studentList] = await Promise.all([
        reportsApi.getReports(token, undefined, activeTab === "class" ? "ClassSummary" : "StudentProgress"),
        activeTab === "student" ? reportsApi.getStudents(token) : Promise.resolve(students),
      ]);
      setReports(data);
      if (activeTab === "student") setStudents(studentList as StudentOption[]);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { load(tab); }, [load, tab]);

  const handleTriggerAll = async () => {
    if (!token || triggering) return;
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const res = await reportsApi.triggerWeeklyRun(token);
      setTriggerMsg(`All-student job enqueued (ID: ${res.jobId}). Reports will appear shortly.`);
      setTimeout(() => load(tab), 3000);
    } catch (e) {
      setTriggerMsg(e instanceof ApiError ? e.detail : "Failed to trigger run.");
    } finally {
      setTriggering(false);
    }
  };

  const handleTriggerClass = async () => {
    if (!token || triggering) return;
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const res = await reportsApi.triggerClassReport(token);
      setTriggerMsg(`Class report job enqueued (ID: ${res.jobId}). Report will appear shortly.`);
      setTimeout(() => load(tab), 3000);
    } catch (e) {
      setTriggerMsg(e instanceof ApiError ? e.detail : "Failed to trigger run.");
    } finally {
      setTriggering(false);
    }
  };

  const handleTriggerStudent = async (studentId: string) => {
    if (!token || triggering) return;
    setTriggering(true);
    setShowPicker(false);
    setTriggerMsg(null);
    try {
      const res = await reportsApi.triggerStudentReport(studentId, token);
      const name = students.find(s => s.id === studentId)?.name ?? studentId;
      setTriggerMsg(`Report for ${name} enqueued (ID: ${res.jobId}). Will appear shortly.`);
      setTimeout(() => load(tab), 3000);
    } catch (e) {
      setTriggerMsg(e instanceof ApiError ? e.detail : "Failed to trigger run.");
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-slate-50">
            <FileText className="h-7 w-7 text-brand-500" />
            Progress Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            AI-generated reports. Review before sharing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(tab)}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {tab === "student" && (
            <>
              <button
                onClick={() => setShowPicker(true)}
                disabled={triggering || students.length === 0}
                className="flex items-center gap-2 rounded-lg border border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/20 px-3 py-2 text-sm font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors disabled:opacity-50"
              >
                <Users className="h-4 w-4" />
                Run for Student
              </button>
              <button
                onClick={handleTriggerAll}
                disabled={triggering}
                className="flex items-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-60"
              >
                {triggering ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Run All
              </button>
            </>
          )}

          {tab === "class" && (
            <button
              onClick={handleTriggerClass}
              disabled={triggering}
              className="flex items-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-60"
            >
              {triggering ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />}
              Run Class Report
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-slate-800 p-1 w-fit">
        {([
          { key: "student", label: "Student Reports", Icon: Users },
          { key: "class",   label: "Class Report",    Icon: BarChart2 },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              tab === key
                ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 shadow-sm"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {triggerMsg && (
        <Alert variant={triggerMsg.includes("enqueued") ? "success" : "error"} message={triggerMsg} />
      )}
      {error && <Alert variant="error" message={error} />}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400 dark:text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <ReportTable reports={reports} />
      )}

      {showPicker && (
        <StudentPickerModal
          students={students}
          triggering={triggering}
          onSelect={handleTriggerStudent}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
