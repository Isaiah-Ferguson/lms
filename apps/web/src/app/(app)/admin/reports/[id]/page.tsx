"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle, FileText } from "lucide-react";
import { reportsApi, ApiError, type ProgressReportDetail } from "@/lib/api-client";
import { useAuthedToken } from "@/lib/use-authed-token";
import { Alert } from "@/components/ui/Alert";
import { formatDate } from "@/lib/date-utils";

// ─── Minimal markdown renderer ────────────────────────────────────────────────
// Converts ## Heading, **bold**, and paragraphs to HTML-safe JSX.

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="mt-6 mb-2 text-base font-bold text-gray-800 dark:text-slate-200 border-b border-gray-100 dark:border-slate-800 pb-1">
          {line.slice(3)}
        </h2>
      );
    } else if (line === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      // Inline **bold** support
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      elements.push(
        <p key={key++} className="text-sm leading-relaxed text-gray-700 dark:text-slate-300">
          {parts.map((part, i) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={i} className="font-semibold text-gray-900 dark:text-slate-100">{part.slice(2, -2)}</strong>
              : part
          )}
        </p>
      );
    }
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthedToken();

  const [report, setReport] = useState<ProgressReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    reportsApi.getReport(id, token)
      .then(setReport)
      .catch((e) => setError(e instanceof ApiError ? e.detail : "Failed to load report."))
      .finally(() => setLoading(false));
  }, [token, id]);

  const handlePublish = async () => {
    if (!token || !id || publishing) return;
    setPublishing(true);
    setPublishMsg(null);
    try {
      await reportsApi.publishReport(id, token);
      setReport((r) => r ? { ...r, status: "Published" } : r);
      setPublishMsg("Report published successfully.");
    } catch (e) {
      setPublishMsg(e instanceof ApiError ? e.detail : "Failed to publish.");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Alert variant="error" message={error ?? "Report not found."} />
        <Link href="/admin/reports" className="inline-flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        href="/admin/reports"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All Reports
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <FileText className="h-5 w-5 text-brand-500 shrink-0" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-slate-50">
                {report.studentName}
              </h1>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500 dark:text-slate-400">
              <span>Week of <strong className="text-gray-700 dark:text-slate-300">{formatDate(report.weekOf)}</strong></span>
              <span>Generated <strong className="text-gray-700 dark:text-slate-300">{report.generatedAt ? formatDate(report.generatedAt) : "—"}</strong></span>
              <span className="font-mono text-xs">{report.model}</span>
            </div>
          </div>

          {report.status === "Generated" && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-green-500 hover:bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-60"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Publish
            </button>
          )}

          {report.status === "Published" && (
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1.5 text-sm font-semibold text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Published
            </span>
          )}
        </div>

        {publishMsg && (
          <div className="mt-4">
            <Alert
              variant={publishMsg.includes("successfully") ? "success" : "error"}
              message={publishMsg}
            />
          </div>
        )}
      </div>

      {/* Report content */}
      <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6">
        {report.content ? (
          <MarkdownContent content={report.content} />
        ) : report.status === "Failed" ? (
          <div className="flex items-center gap-3 text-red-500">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Generation failed</p>
              {report.failureReason && (
                <p className="text-sm text-red-400 mt-0.5">{report.failureReason}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-slate-500">No content available.</p>
        )}
      </div>
    </div>
  );
}
