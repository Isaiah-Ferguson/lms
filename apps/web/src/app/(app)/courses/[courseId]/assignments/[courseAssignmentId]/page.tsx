"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, BookOpen, Users } from "lucide-react";
import { assignmentsApi, instructorApi, gradesApi, type Assignment } from "@/lib/api-client";
import { getToken, getUserRole } from "@/lib/auth";
import { SubmissionCard } from "./components/SubmissionCard";
import { ParticipationCard } from "./components/ParticipationCard";
import type { SubmissionState } from "./components/SubmissionCard";
import type { ParticipationCounts } from "./components/ParticipationCard";

interface AssignmentDetailsPageProps {
  params: {
    courseId: string;
    courseAssignmentId: string;
  };
}

function timeRemaining(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Past due";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

function parseRubric(json: string): { criterion: string; points: number; description: string }[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* ignore */ }
  return [];
}

// Stub initial submission state — swap for real API call when available
function getStubSubmission(): SubmissionState {
  return { status: "NotSubmitted", submittedAt: null, fileName: null, fileSize: null };
}

export default function AssignmentDetailsPage({ params }: AssignmentDetailsPageProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissionState, setSubmissionState] = useState<SubmissionState>(getStubSubmission());
  const [participationCounts, setParticipationCounts] = useState<ParticipationCounts>({
    participants: 0,
    submitted: 0,
    needsGrading: 0,
  });
  const [studentGrade, setStudentGrade] = useState<{ totalScore: number | null; maxScore: number } | null>(null);

  // Admin edit state
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignmentType, setEditAssignmentType] = useState("Challenge");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const role = getUserRole();
  const isInstructor = role === "Admin" || role === "Instructor";

  useEffect(() => {
    const token = getToken();
    if (!token) { setError("Session expired"); setLoading(false); return; }

    // Fetch assignment data
    Promise.all([
      assignmentsApi.getAssignment(params.courseAssignmentId, token),
      assignmentsApi.getMySubmission(params.courseAssignmentId, token),
    ])
      .then(([a, submission]) => {
        setAssignment(a);
        setEditDueDate(new Date(a.dueDate).toISOString().slice(0, 16));
        setEditAssignmentType(a.assignmentType ?? "Challenge");

        // Map API response to SubmissionState
        if (submission.hasSubmitted) {
          setSubmissionState({
            status: "Submitted",
            submittedAt: submission.submittedAt,
            fileName: submission.fileName,
            fileSize: submission.fileSize,
            submissionId: submission.submissionId,
          });
        }
      })
      .catch(() => setError("Assignment not found."))
      .finally(() => setLoading(false));

    // Fetch student's grade for this assignment
    gradesApi.getMyGrades(params.courseId, token)
      .then((grades) => {
        const gradeRow = grades.rows.find(r => r.assignmentId === params.courseAssignmentId);
        if (gradeRow) {
          setStudentGrade({
            totalScore: gradeRow.totalScore,
            maxScore: gradeRow.maxScore,
          });
        }
      })
      .catch(() => {
        // Grade not available yet
      });

    // Fetch participation counts (only for instructors)
    if (isInstructor) {
      instructorApi.getAssignmentSubmissionsRoster(params.courseAssignmentId, token)
        .then((roster) => {
          const participants = roster.rows.length;
          const submitted = roster.rows.filter(row => row.submissionId !== null).length;
          const needsGrading = roster.rows.filter(row =>
            row.submissionId !== null && (row.status === "Submitted" || row.status === "Processing")
          ).length;
          setParticipationCounts({ participants, submitted, needsGrading });
        })
        .catch((err) => {
          // Set to zero on error
          setParticipationCounts({ participants: 0, submitted: 0, needsGrading: 0 });
        });
    }
  }, [params.courseAssignmentId, isInstructor]);

  async function handleSaveDueDate(e: React.FormEvent) {
    e.preventDefault();
    if (!assignment) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const updated = await assignmentsApi.updateAssignment(assignment.id, {
        title: assignment.title,
        assignmentType: editAssignmentType,
        instructions: assignment.instructions,
        dueDate: new Date(editDueDate).toISOString(),
        rubricJson: assignment.rubricJson,
      }, token);
      setAssignment(updated);
      setSaveMsg("Saved successfully.");
    } catch {
      setSaveMsg("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-500">
        Loading assignment…
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Link
          href={`/courses/${params.courseId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to course
        </Link>
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
          {error ?? "Assignment not found."}
        </div>
      </div>
    );
  }

  const rubric = parseRubric(assignment.rubricJson);
  const totalPoints = rubric.reduce((s, r) => s + r.points, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/courses/${params.courseId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to course
      </Link>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">
              {assignment.moduleTitle}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{assignment.title}</h1>
          </div>
          <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            {studentGrade?.totalScore !== null && studentGrade?.totalScore !== undefined
              ? `${studentGrade.totalScore} / ${studentGrade.maxScore} pts`
              : totalPoints > 0
              ? `${totalPoints} pts max`
              : "Ungraded"}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            Due {new Date(assignment.dueDate).toLocaleString()} · {timeRemaining(assignment.dueDate)}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {assignment.courseTitle}
          </span>
        </div>
      </header>

      {/* ── Two-column layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">

        {/* ── Left: instructions + rubric ─────────────────────────────────── */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Instructions</h2>
            {assignment.instructions ? (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                {assignment.instructions}
              </div>
            ) : (
              <p className="text-sm italic text-gray-500">No instructions provided.</p>
            )}
          </div>

          {rubric.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-base font-semibold text-gray-900">Rubric</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                    <th className="pb-2 font-medium">Criterion</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 text-right font-medium">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rubric.map((r, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-4 font-medium text-gray-800">{r.criterion}</td>
                      <td className="py-2 pr-4 text-gray-600">{r.description}</td>
                      <td className="py-2 text-right text-gray-800">{r.points}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-200">
                    <td colSpan={2} className="pt-2 text-right text-xs font-semibold text-gray-500">
                      Total
                    </td>
                    <td className="pt-2 text-right font-bold text-gray-900">{totalPoints}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Right: action cards ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Submission card — shown to all */}
          <SubmissionCard
            courseAssignmentId={params.courseAssignmentId}
            initial={submissionState}
          />

          {/* Participation counts — instructors only */}
          {isInstructor && (
            <ParticipationCard counts={participationCounts} isInstructor={isInstructor} />
          )}

          {/* Instructor-only: manage assignment */}
          {isInstructor && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Users className="h-4 w-4 text-gray-500" /> Manage Assignment
              </h2>

              <form onSubmit={handleSaveDueDate} className="space-y-3">
                <div>
                  <label htmlFor="AssignmentType" className="mb-1 block text-xs font-medium text-gray-600">
                    Type
                  </label>
                  <select
                    id="AssignmentType"
                    value={editAssignmentType}
                    onChange={(e) => setEditAssignmentType(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="MiniChallenge">Mini Challenge</option>
                    <option value="Challenge">Challenge</option>
                    <option value="Project">Project</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="DueDate" className="mb-1 block text-xs font-medium text-gray-600">
                    Due Date
                  </label>
                  <input
                  id="DueDate"
                    type="datetime-local"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                {saveMsg && (
                  <p className={`text-xs ${saveMsg.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
                    {saveMsg}
                  </p>
                )}
              </form>

              <div className="border-t border-gray-100 pt-3">
                <Link
                  href={`/courses/${params.courseId}/assignments/${params.courseAssignmentId}/submissions`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Users className="h-4 w-4" />
                  View Submissions
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
