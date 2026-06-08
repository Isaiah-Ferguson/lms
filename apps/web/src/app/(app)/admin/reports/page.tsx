"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FileText, RefreshCw, ChevronRight, AlertCircle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { reportsApi, ApiError, type ProgressReportSummary, type ProgressReportStatus } from "@/lib/api-client";
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

function groupByWeek(reports: ProgressReportSummary[]): Map<string, ProgressReportSummary[]> {
  const map = new Map<string, ProgressReportSummary[]>();
  for (const r of reports) {
    const week = r.weekOf.split("T")[0];
    if (!map.has(week)) map.set(week, []);
    map.get(week)!.push(r);
  }
  return map;
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ReportsPage() {
  const token = useAuthedToken();
  const [reports, setReports] = useState<ProgressReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getReports(token);
      setReports(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleTrigger = async () => {
    if (!token || triggering) return;
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const res = await reportsApi.triggerWeeklyRun(token);
      setTriggerMsg(`Job enqueued (ID: ${res.jobId}). Reports will appear shortly.`);
    } catch (e) {
      setTriggerMsg(e instanceof ApiError ? e.detail : "Failed to trigger run.");
    } finally {
      setTriggering(false);
    }
  };

  const grouped = groupByWeek(reports);
  const weeks = Array.from(grouped.keys()).sort().reverse();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-slate-50">
            <FileText className="h-7 w-7 text-brand-500" />
            Weekly Progress Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            AI-generated student progress reports. Review before sharing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="flex items-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-60"
          >
            {triggering ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Run Now
          </button>
        </div>
      </div>

      {triggerMsg && (
        <Alert variant={triggerMsg.includes("enqueued") ? "success" : "error"} message={triggerMsg} />
      )}
      {error && <Alert variant="error" message={error} />}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400 dark:text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 py-24 text-center">
          <FileText className="mb-4 h-12 w-12 text-gray-300 dark:text-slate-600" />
          <p className="text-base font-medium text-gray-500 dark:text-slate-400">No reports yet</p>
          <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">Click &ldquo;Run Now&rdquo; to generate the first batch.</p>
        </div>
      ) : (
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
                        <th className="px-5 py-3 text-left font-semibold text-gray-600 dark:text-slate-400">Student</th>
                        <th className="px-5 py-3 text-left font-semibold text-gray-600 dark:text-slate-400">Status</th>
                        <th className="px-5 py-3 text-left font-semibold text-gray-600 dark:text-slate-400 hidden sm:table-cell">Generated</th>
                        <th className="px-5 py-3 text-left font-semibold text-gray-600 dark:text-slate-400 hidden md:table-cell">Model</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                      {rows.map((r) => (
                        <tr key={r.id} className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-slate-100">{r.studentName}</td>
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
                                View
                                <ChevronRight className="h-3.5 w-3.5" />
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
      )}
    </div>
  );
}
