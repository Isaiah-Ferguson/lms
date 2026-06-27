"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download, Star } from "lucide-react";
import type { AssignmentRosterStatus } from "@/lib/assignment-submissions-roster";
import { instructorApi, type ArtifactInfo } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { formatDateTime } from "@/lib/date-utils";
import { downloadFromUrl, ensureProtocol } from "@/lib/utils";

export interface GradeModalRow {
  userId: string;
  name: string;
  email: string;
  assignmentId: string;
  /** Undefined when the student has not turned anything in. */
  submissionId?: string;
  submittedAt: string | null;
  dueDate: string | null;
  currentGrade: string | null;
  currentFeedback: string | null;
  status: AssignmentRosterStatus;
}

export interface GradeResult {
  userId: string;
  score: string;
  outOf: string;
  feedback: string;
}

interface GradeModalProps {
  row: GradeModalRow;
  onClose: () => void;
  onSave: (result: GradeResult) => void;
}

function isPastDue(submittedAt: string | null, dueDate: string | null): boolean {
  if (!submittedAt || !dueDate) return false;
  return new Date(submittedAt) > new Date(dueDate);
}

function parseExistingGrade(grade: string | null): { score: string; outOf: string } {
  if (!grade) return { score: "", outOf: "100" };
  // handles "93 / 100", "93%", "100%", "86 / 100"
  const slashMatch = grade.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (slashMatch) return { score: slashMatch[1], outOf: slashMatch[2] };
  const pctMatch = grade.match(/^(\d+)%$/);
  if (pctMatch) return { score: pctMatch[1], outOf: "100" };
  return { score: grade, outOf: "100" };
}

const QUICK_SCORES = [100, 95, 90, 85, 80, 75, 70];

export function GradeModal({ row, onClose, onSave }: GradeModalProps) {
  const parsed = parseExistingGrade(row.currentGrade);
  const [score, setScore] = useState(parsed.score);
  const [outOf, setOutOf] = useState(parsed.outOf);
  const [feedback, setFeedback] = useState(row.currentFeedback ?? "");
  const [saving, setSaving] = useState(false);
  const [artifacts, setArtifacts] = useState<ArtifactInfo[] | null>(null);
  const [loadingArtifacts, setLoadingArtifacts] = useState(true);
  const [externalUrls, setExternalUrls] = useState<{
    figmaUrl: string | null;
    githubRepoUrl: string | null;
    hostedUrl: string | null;
  } | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const pastDue = isPastDue(row.submittedAt, row.dueDate);
  const scoreNum = parseFloat(score);
  const outOfNum = parseFloat(outOf);
  const pct = !isNaN(scoreNum) && !isNaN(outOfNum) && outOfNum > 0
    ? Math.round((scoreNum / outOfNum) * 100)
    : null;

  useEffect(() => {
    async function loadArtifacts() {
      // Nothing turned in — no artifacts or external links to load.
      if (!row.submissionId) {
        setLoadingArtifacts(false);
        return;
      }

      const token = getToken();
      if (!token) {
        setLoadingArtifacts(false);
        return;
      }

      try {
        const submission = await instructorApi.getSubmissionDetail(
          row.submissionId,
          token
        );
        setArtifacts(submission.artifacts);
        setExternalUrls({
          figmaUrl: submission.figmaUrl ?? null,
          githubRepoUrl: submission.githubRepoUrl ?? null,
          hostedUrl: submission.hostedUrl ?? null,
        });
      } catch (err) {
      } finally {
        setLoadingArtifacts(false);
      }
    }

    void loadArtifacts();
  }, [row.submissionId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function handleSave() {
    if (!score.trim()) return;
    setSaving(true);
    
    try {
      const token = getToken();
      if (!token) {
        alert("Session expired. Please sign in again.");
        setSaving(false);
        return;
      }

      const scoreNum = parseFloat(score);
      const outOfNum = parseFloat(outOf);
      
      if (isNaN(scoreNum) || isNaN(outOfNum) || outOfNum <= 0) {
        alert("Please enter valid numbers for score and total.");
        setSaving(false);
        return;
      }

      const body = {
        TotalScore: scoreNum,
        RubricBreakdownJson: JSON.stringify({ outOf: outOfNum }),
        OverallComment: feedback,
      };

      // Call the real API to save the grade. Students who never turned the
      // assignment in have no submission, so grade them by assignment + student.
      if (row.submissionId) {
        await instructorApi.gradeSubmission(row.submissionId, body, token);
      } else {
        await instructorApi.gradeByStudent(row.assignmentId, row.userId, body, token);
      }

      onSave({ userId: row.userId, score, outOf, feedback });
    } catch (error) {
      alert("Failed to save grade. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function gradeColor(): string {
    if (pct === null) return "text-gray-700";
    if (pct >= 90) return "text-emerald-600";
    if (pct >= 75) return "text-blue-600";
    if (pct >= 60) return "text-amber-600";
    return "text-red-600";
  }

  async function handleDownload(url: string, fileName: string) {
    try {
      await downloadFromUrl(url, fileName);
    } catch (err) {
      alert("Failed to download file: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  return createPortal(
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="grade-modal-title"
        className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 id="grade-modal-title" className="text-base font-semibold text-gray-900 dark:text-white">Grade Submission</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{row.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{row.email}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="ml-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Submission meta */}
        <div className="border-b border-gray-50 bg-gray-50 px-6 py-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:border-gray-700/50 dark:bg-gray-800 dark:text-gray-400">
          <span>
            Submitted:{" "}
            {row.submittedAt ? (
              <span className={pastDue ? "font-semibold text-red-600 dark:text-red-400" : "font-medium text-gray-700 dark:text-gray-300"}>
                {formatDateTime(row.submittedAt)}
                {pastDue && " — Past due"}
              </span>
            ) : (
              <span className="font-semibold text-red-600 dark:text-red-400">Not submitted</span>
            )}
          </span>
          {row.dueDate && (
            <span>
              Due: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDateTime(row.dueDate)}</span>
            </span>
          )}
          {/* Download */}
          {loadingArtifacts ? (
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">Loading files...</span>
          ) : artifacts && artifacts.length > 0 ? (
            <button
              onClick={() => handleDownload(artifacts[0].readUrl, artifacts[0].fileName)}
              className="ml-auto flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <Download className="h-3 w-3" />
              Download {artifacts[0].fileName}
            </button>
          ) : (
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">No files</span>
          )}
        </div>

        {/* External URLs */}
        {externalUrls && (externalUrls.figmaUrl || externalUrls.githubRepoUrl || externalUrls.hostedUrl) && (
          <div className="border-b border-gray-50 bg-white px-6 py-3 dark:border-gray-700/50 dark:bg-gray-900">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">External Links</p>
            <div className="space-y-2">
              {externalUrls.figmaUrl && (
                <a
                  href={ensureProtocol(externalUrls.figmaUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-gray-200 p-2 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950/40">
                    <span className="text-purple-600 font-bold text-xs dark:text-purple-400">F</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Figma Design</p>
                    <p className="text-[10px] text-gray-500 truncate dark:text-gray-400">{externalUrls.figmaUrl}</p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">↗</span>
                </a>
              )}
              {externalUrls.githubRepoUrl && (
                <a
                  href={ensureProtocol(externalUrls.githubRepoUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-gray-200 p-2 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    <span className="text-gray-600 font-bold text-xs dark:text-gray-300">G</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">GitHub Repository</p>
                    <p className="text-[10px] text-gray-500 truncate dark:text-gray-400">{externalUrls.githubRepoUrl}</p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">↗</span>
                </a>
              )}
              {externalUrls.hostedUrl && (
                <a
                  href={ensureProtocol(externalUrls.hostedUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-gray-200 p-2 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/40">
                    <span className="text-blue-600 font-bold text-xs dark:text-blue-400">H</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Hosted Application</p>
                    <p className="text-[10px] text-gray-500 truncate dark:text-gray-400">{externalUrls.hostedUrl}</p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">↗</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Score row */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Score
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="0"
                className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-center text-lg font-bold text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
              <span className="text-gray-400 dark:text-gray-500">/</span>
              <input
                type="number"
                min={1}
                value={outOf}
                onChange={(e) => setOutOf(e.target.value)}
                className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm text-gray-600 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              />
              {pct !== null && (
                <span className={`ml-2 text-2xl font-bold ${gradeColor()}`}>
                  {pct}%
                </span>
              )}
            </div>

            {/* Quick-pick buttons */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_SCORES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { setScore(String(q)); setOutOf("100"); }}
                  className={`flex items-center gap-0.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors
                    ${score === String(q) && outOf === "100"
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800"
                    }`}
                >
                  <Star className="h-2.5 w-2.5" />
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Feedback <span className="font-normal normal-case text-gray-400 dark:text-gray-500">(visible to student)</span>
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="Great work on the component architecture. Consider extracting the auth logic into a custom hook for reusability..."
              className="block w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !score.trim()}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : row.currentGrade ? "Update Grade" : "Save Grade"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
