"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, User, BookOpen, Github, FileText,
  ExternalLink, CheckCircle2, Clock,
} from "lucide-react";

import { instructorApi, ApiError } from "@/lib/api-client";
import type { SubmissionDetail, ExistingGrade } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { formatBytes, formatStatus } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { SubmissionStatusBadge } from "@/components/submissions/SubmissionStatus";
import { RubricGrader } from "@/components/instructor/RubricGrader";
import type { RubricScore } from "@/components/instructor/RubricGrader";

export default function InstructorGradingPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId as string;

  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Grading state
  const [rubricScores, setRubricScores] = useState<RubricScore[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [overallComment, setOverallComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedGrade, setSavedGrade] = useState<ExistingGrade | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) { router.replace("/login"); return; }

    setLoading(true);
    setLoadError(null);
    try {
      const data = await instructorApi.getSubmissionDetail(submissionId, token);
      setDetail(data);

      if (data.existingGrade) {
        setSavedGrade(data.existingGrade);
        setTotalScore(data.existingGrade.totalScore);
        setOverallComment(data.existingGrade.overallComment);
      }
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.detail : "Failed to load submission."
      );
    } finally {
      setLoading(false);
    }
  }, [submissionId, router]);

  useEffect(() => { load(); }, [load]);

  async function handleSaveGrade() {
    const token = getToken();
    if (!token || !detail) return;

    setSaveError(null);
    setSaving(true);
    try {
      const grade = await instructorApi.gradeSubmission(
        submissionId,
        {
          TotalScore: totalScore,
          RubricBreakdownJson: JSON.stringify(rubricScores),
          OverallComment: overallComment,
        },
        token
      );
      setSavedGrade(grade);
    } catch (err) {
      setSaveError(
        err instanceof ApiError
          ? err.errors?.join(" ") ?? err.detail
          : "Failed to save grade."
      );
    } finally {
      setSaving(false);
    }
  }

  // Ensure URL has protocol
  function ensureProtocol(url: string | null): string | undefined {
    if (!url) return undefined;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `https://${url}`;
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
          <p className="text-sm">Loading submission…</p>
        </div>
      </div>
    );
  }

  if (loadError || !detail) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Alert variant="error" message={loadError ?? "Submission not found."} />
        <button
          onClick={() => router.back()}
          className="mt-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>
    );
  }

  const isAlreadyGraded = !!savedGrade;
  const maxScore = detail.assignment.maxScore;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <SubmissionStatusBadge status={detail.status} />
            <span className="text-xs text-gray-400">
              Attempt #{detail.attemptNumber}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[1fr_380px]">

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Student info */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{detail.student.name}</p>
                <p className="text-sm text-gray-400">{detail.student.email}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-400">Submitted</dt>
                <dd className="font-medium text-gray-700">
                  {new Date(detail.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Type</dt>
                <dd className="font-medium text-gray-700">{formatStatus(detail.type)}</dd>
              </div>
            </dl>
          </Card>

          {/* Assignment instructions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-gray-400" />
                <CardTitle>{detail.assignment.title}</CardTitle>
              </div>
              <CardDescription>Assignment instructions</CardDescription>
            </CardHeader>
            <div className="prose prose-sm max-w-none text-gray-700">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {detail.assignment.instructions}
              </p>
            </div>
          </Card>

          {/* External URLs */}
          <Card>
            <CardHeader>
              <CardTitle>External Links</CardTitle>
              <CardDescription>Provided by the student</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {detail.figmaUrl ? (
                <a
                  href={ensureProtocol(detail.figmaUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">Figma Design</p>
                    <p className="text-xs text-gray-500 truncate">{detail.figmaUrl}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
                </a>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-400">Figma Design</p>
                    <p className="text-xs text-gray-400">Not provided</p>
                  </div>
                </div>
              )}
              {detail.githubRepoUrl ? (
                <a
                  href={ensureProtocol(detail.githubRepoUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <Github className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">GitHub Repository</p>
                    <p className="text-xs text-gray-500 truncate">{detail.githubRepoUrl}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
                </a>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <Github className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-400">GitHub Repository</p>
                    <p className="text-xs text-gray-400">Not provided</p>
                  </div>
                </div>
              )}
              {detail.hostedUrl ? (
                <a
                  href={ensureProtocol(detail.hostedUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <ExternalLink className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">Hosted Application</p>
                    <p className="text-xs text-gray-500 truncate">{detail.hostedUrl}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
                </a>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <ExternalLink className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-400">Hosted Application</p>
                    <p className="text-xs text-gray-400">Not provided</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Student Note */}
          {detail.note && (
            <Card>
              <CardHeader>
                <CardTitle>Student Note</CardTitle>
                <CardDescription>Comment provided by the student</CardDescription>
              </CardHeader>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{detail.note}</p>
              </div>
            </Card>
          )}

          {/* Submission content */}
          <Card>
            <CardHeader>
              <CardTitle>
                {detail.type === "GitHub" ? "GitHub Repository" : "Uploaded Files"}
              </CardTitle>
            </CardHeader>

            {/* GitHub submission */}
            {detail.type === "GitHub" && detail.gitHubInfo && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                  <Github className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <a
                      href={detail.gitHubInfo.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                    >
                      {detail.gitHubInfo.repoUrl}
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                    <p className="text-xs text-gray-500">
                      Branch:{" "}
                      <code className="rounded bg-gray-100 px-1 py-0.5 text-gray-700">
                        {detail.gitHubInfo.branch}
                      </code>
                    </p>
                    {detail.gitHubInfo.commitHash && (
                      <p className="text-xs text-gray-500">
                        Commit:{" "}
                        <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-gray-700">
                          {detail.gitHubInfo.commitHash}
                        </code>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* File upload submission */}
            {detail.type === "Upload" && detail.artifacts && (
              <ul className="space-y-2">
                {detail.artifacts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {a.fileName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {a.contentType} · {formatBytes(a.sizeBytes)}
                      </p>
                    </div>
                    <a
                      href={a.readUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex shrink-0 items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Download
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ── Right column — grading panel ────────────────────────────────── */}
        <div className="space-y-5">

          {/* Already graded banner */}
          {isAlreadyGraded && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              <div className="text-sm">
                <p className="font-medium text-green-800">Already graded</p>
                <p className="text-green-600">
                  {new Date(savedGrade!.gradedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Grade Submission</CardTitle>
              <CardDescription>
                Max score: {maxScore} pts
              </CardDescription>
            </CardHeader>

            {/* Rubric grader */}
            <div className="mb-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Rubric
              </p>
              <RubricGrader
                rubricJson={detail.assignment.rubricJson}
                maxScore={maxScore}
                initialBreakdown={savedGrade?.rubricBreakdownJson}
                onChange={(scores, total) => {
                  setRubricScores(scores);
                  setTotalScore(total);
                }}
                disabled={false}
              />
            </div>

            {/* Manual total override (shown when no rubric criteria) */}
            {JSON.parse(detail.assignment.rubricJson || "[]").length === 0 && (
              <div className="mb-5">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Total score
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={maxScore}
                    step={0.5}
                    value={totalScore}
                    onChange={(e) => setTotalScore(parseFloat(e.target.value) || 0)}
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-sm text-gray-400">/ {maxScore}</span>
                </div>
              </div>
            )}

            {/* Overall comment */}
            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Overall comment
              </label>
              <textarea
                rows={4}
                value={overallComment}
                onChange={(e) => setOverallComment(e.target.value)}
                placeholder="Feedback for the student…"
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {saveError && (
              <Alert variant="error" message={saveError} className="mb-4" />
            )}

            {savedGrade && !saveError && (
              <Alert
                variant="success"
                message={`Grade saved: ${savedGrade.totalScore} / ${maxScore} pts`}
                className="mb-4"
              />
            )}

            <Button
              className="w-full"
              size="lg"
              loading={saving}
              onClick={handleSaveGrade}
            >
              {isAlreadyGraded ? "Update grade" : "Save grade"}
            </Button>

            {/* Grade summary */}
            {savedGrade && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Last graded {new Date(savedGrade.gradedAt).toLocaleString()}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
