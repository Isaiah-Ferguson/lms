"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, BookOpen, Users, Download } from "lucide-react";
import { assignmentsApi, instructorApi, gradesApi, type Assignment } from "@/lib/api-client";
import { getToken, getUserRole } from "@/lib/auth";
import { SubmissionCard } from "./components/SubmissionCard";
import { ParticipationCard } from "./components/ParticipationCard";
import { EditAssignmentModal } from "./components/EditAssignmentModal";
import type { SubmissionState } from "./components/SubmissionCard";
import type { ParticipationCounts } from "./components/ParticipationCard";
import { formatDateTime, parseApiDate } from "@/lib/date-utils";

interface AssignmentDetailsPageProps {
  params: {
    courseId: string;
    courseAssignmentId: string;
  };
}

function timeRemaining(iso: string): string {
  const due = parseApiDate(iso);
  if (!due) return "";

  const diff = due.getTime() - Date.now();
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);

  if (diff <= 0) {
    if (days > 0) return `Overdue by ${days}d ${hours}h`;
    if (hours > 0) return `Overdue by ${hours}h ${minutes}m`;
    if (minutes > 0) return `Overdue by ${minutes}m`;
    return "Overdue";
  }

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;
  return `${minutes}m remaining`;
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
        // Convert UTC date to local datetime-local format
        const utcDate = parseApiDate(a.dueDate);
        if (utcDate) {
          const offset = utcDate.getTimezoneOffset() * 60000; // offset in milliseconds
          const localISOTime = new Date(utcDate.getTime() - offset).toISOString().slice(0, 16);
          setEditDueDate(localISOTime);
        }
        setEditAssignmentType(a.assignmentType ?? "Challenge");

        // Map API response to SubmissionState
        if (submission.hasSubmitted) {
          setSubmissionState({
            status: submission.status === "Returned" ? "Returned" : "Submitted",
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
      // Convert datetime-local value (which is in local time) to UTC ISO string
      // datetime-local format: "2026-04-13T14:30" (no timezone info)
      // We need to treat this as local time and convert to UTC
      const localDate = new Date(editDueDate);
      
      const updated = await assignmentsApi.updateAssignment(assignment.id, {
        title: assignment.title,
        assignmentType: editAssignmentType,
        instructions: assignment.instructions,
        dueDate: localDate.toISOString(),
        attachmentUrl: assignment.attachmentUrl,
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
      <div className="flex items-center justify-center py-24 text-sm text-gray-500 dark:text-slate-400">
        Loading assignment…
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Link
          href={`/courses/${params.courseId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" /> Back to course
        </Link>
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-sm text-gray-500 dark:text-slate-400">
          {error ?? "Assignment not found."}
        </div>
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/courses/${params.courseId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to course
      </Link>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 dark:text-slate-400">
              {assignment.moduleTitle}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">{assignment.title}</h1>
          </div>
          <span className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-950/30 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
            {studentGrade?.totalScore !== null && studentGrade?.totalScore !== undefined
              ? `${studentGrade.totalScore} / ${studentGrade.maxScore} pts`
              : `${studentGrade?.maxScore ?? 100} pts max`}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            Due {formatDateTime(assignment.dueDate)} · {timeRemaining(assignment.dueDate)}
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
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-slate-100">Instructions</h2>
            {assignment.instructions ? (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 dark:text-slate-300">
                {assignment.instructions}
              </div>
            ) : (
              <p className="text-sm italic text-gray-500 dark:text-slate-500">No instructions provided.</p>
            )}
          </div>

          {assignment.attachmentUrl && (
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
              <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-slate-100">Assignment Files</h2>
              <a
                href={assignment.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download Assignment File
              </a>
            </div>
          )}
        </div>

        {/* ── Right: action cards ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Submission card — shown to students only */}
          {!isInstructor && (
            <SubmissionCard
              courseAssignmentId={params.courseAssignmentId}
              initial={submissionState}
            />
          )}

          {/* Participation counts — instructors only */}
          {isInstructor && (
            <ParticipationCard counts={participationCounts} isInstructor={isInstructor} />
          )}

          {/* Instructor-only: manage assignment */}
          {isInstructor && (
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
                <Users className="h-4 w-4 text-gray-500 dark:text-slate-400" /> Manage Assignment
              </h2>

              <div className="border-t border-gray-100 dark:border-slate-700 pt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                >
                  Edit Assignment
                </button>
                <Link
                  href={`/courses/${params.courseId}/assignments/${params.courseAssignmentId}/submissions`}
                  className="flex w-full items-center justify-center rounded-lg gap-2 bg-gray-900 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:hover:bg-slate-600 disabled:opacity-50"
                >
                  <Users className="h-4 w-4" />
                  View Submissions
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Assignment Modal */}
      {isInstructor && assignment && (
        <EditAssignmentModal
          isOpen={isEditModalOpen}
          assignment={assignment}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={(updated) => {
            setAssignment(updated);
            setIsEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
