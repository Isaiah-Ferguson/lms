"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckSquare, Users, Clock } from "lucide-react";
import {
  type AssignmentRosterStatus,
} from "@/lib/assignment-submissions-roster";
import { FiltersBar, type RosterQuickFilter } from "./components/FiltersBar";
import { RosterTable, type RosterRow } from "./components/RosterTable";
import { GradeModal, type GradeModalRow, type GradeResult } from "./components/GradeModal";
import { getUserRole, getToken } from "@/lib/auth";
import { instructorApi } from "@/lib/api-client";

interface AssignmentSubmissionsPageProps {
  params: {
    courseId: string;
    courseAssignmentId: string;
  };
}

export default function AssignmentSubmissionsPage({ params }: AssignmentSubmissionsPageProps) {
  const role = getUserRole();
  const canView = role === "Admin" || role === "Instructor";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<RosterQuickFilter>("All");
  const [gradingRow, setGradingRow] = useState<GradeModalRow | null>(null);

  useEffect(() => {
    async function loadRoster() {
      const token = getToken();
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      try {
        const data = await instructorApi.getAssignmentSubmissionsRoster(
          params.courseAssignmentId,
          token
        );

        setAssignmentTitle(data.assignmentTitle);
        setDueDate(data.dueDate);

        const mappedRows: RosterRow[] = data.rows.map((row) => ({
          user: {
            id: row.userId,
            name: row.userName,
            username: row.userEmail.split("@")[0],
            email: row.userEmail,
          },
          status: row.status as AssignmentRosterStatus,
          submissionId: row.submissionId ?? undefined,
          submittedAt: row.submittedAt,
          grade: row.grade,
          gradedAt: row.gradedAt,
          gradedBy: row.gradedBy,
        }));

        setRows(mappedRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load submissions");
      } finally {
        setLoading(false);
      }
    }

    void loadRoster();
  }, [params.courseAssignmentId]);

  const counts = useMemo(() => {
    const sc: Record<AssignmentRosterStatus, number> = {
      NotSubmitted: 0, Submitted: 0, NeedsGrading: 0, Graded: 0, Returned: 0,
    };
    rows.forEach((r) => { sc[r.status] += 1; });
    return {
      All: rows.length,
      NeedsGrading: sc.NeedsGrading,
      Submitted: sc.Submitted,
      NotSubmitted: sc.NotSubmitted,
      Graded: sc.Graded,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesFilter = activeFilter === "All" || row.status === activeFilter;
      if (!matchesFilter) return false;
      if (!query) return true;
      return (
        row.user.name.toLowerCase().includes(query) ||
        row.user.username.toLowerCase().includes(query) ||
        row.user.email.toLowerCase().includes(query)
      );
    });
  }, [activeFilter, rows, searchQuery]);

  function handleGradeClick(row: RosterRow) {
    setGradingRow({
      userId: row.user.id,
      name: row.user.name,
      email: row.user.email,
      assignmentId: params.courseAssignmentId,
      submissionId: row.submissionId,
      submittedAt: row.submittedAt,
      dueDate: dueDate ?? new Date().toISOString(),
      currentGrade: row.grade,
      currentFeedback: null,
      status: row.status,
    });
  }

  function handleGradeSave(result: GradeResult) {
    const gradeStr = `${result.score} / ${result.outOf}`;
    setRows((prev) =>
      prev.map((r) =>
        r.user.id === result.userId
          ? {
              ...r,
              grade: gradeStr,
              status: "Graded" as AssignmentRosterStatus,
              gradedAt: new Date().toISOString(),
              gradedBy: "You",
            }
          : r
      )
    );
    setGradingRow(null);
  }

  if (!canView) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Link
          href={`/courses/${params.courseId}/assignments/${params.courseAssignmentId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-600 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignment
        </Link>
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-600">
          You do not have permission to view submissions.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <Link
          href={`/courses/${params.courseId}/assignments/${params.courseAssignmentId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-600 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignment
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-600">
          Loading submissions...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <Link
          href={`/courses/${params.courseId}/assignments/${params.courseAssignmentId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-600 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignment
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link
        href={`/courses/${params.courseId}/assignments/${params.courseAssignmentId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-700 dark:text-gray-600 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to assignment
      </Link>

      {/* Header */}
      <header className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Submissions Roster</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{assignmentTitle}</p>

        {/* Summary stat pills */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
            <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="font-semibold text-gray-800 dark:text-gray-100">{counts.All}</span>
            <span className="text-gray-500 dark:text-gray-400">participants</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm dark:border-blue-900/50 dark:bg-blue-950/30">
            <CheckSquare className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            <span className="font-semibold text-blue-800 dark:text-blue-300">{counts.Submitted + counts.NeedsGrading + counts.Graded}</span>
            <span className="text-blue-600 dark:text-blue-400">submitted</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
            <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            <span className="font-semibold text-amber-800 dark:text-amber-300">{counts.NeedsGrading}</span>
            <span className="text-amber-600 dark:text-amber-400">needs grading</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <CheckSquare className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">{counts.Graded}</span>
            <span className="text-emerald-600 dark:text-emerald-400">graded</span>
          </div>
        </div>
      </header>

      <FiltersBar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={counts}
      />

      <RosterTable
        rows={filteredRows}
        dueDate={dueDate ?? new Date().toISOString()}
        onGradeClick={handleGradeClick}
      />

      {gradingRow && (
        <GradeModal
          row={gradingRow}
          onClose={() => setGradingRow(null)}
          onSave={handleGradeSave}
        />
      )}
    </div>
  );
}
