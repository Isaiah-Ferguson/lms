"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckSquare, Users, Clock } from "lucide-react";
import {
  type AssignmentRosterStatus,
} from "@/lib/assignment-submissions-roster";
import { FiltersBar, type RosterQuickFilter } from "./components/FiltersBar";
import { RosterTable } from "./components/RosterTable";
import { GradeModal, type GradeModalRow, type GradeResult } from "./components/GradeModal";
import { getUserRole, getToken } from "@/lib/auth";
import { instructorApi } from "@/lib/api-client";

type RosterRow = {
  user: { id: string; name: string; username: string; email: string };
  status: AssignmentRosterStatus;
  submissionId?: string;
  submittedAt: string | null;
  grade: string | null;
  gradedAt: string | null;
  gradedBy: string | null;
};

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
      NotSubmitted: 0, Submitted: 0, NeedsGrading: 0, Graded: 0,
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
    if (!row.submissionId) return;
    setGradingRow({
      userId: row.user.id,
      name: row.user.name,
      email: row.user.email,
      submissionId: row.submissionId,
      submittedAt: row.submittedAt!,
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
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignment
        </Link>
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
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
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignment
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
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
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignment
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link
        href={`/courses/${params.courseId}/assignments/${params.courseAssignmentId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to assignment
      </Link>

      {/* Header */}
      <header className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Submissions Roster</h1>
        <p className="mt-1 text-sm text-gray-500">{assignmentTitle}</p>

        {/* Summary stat pills */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="font-semibold text-gray-800">{counts.All}</span>
            <span className="text-gray-500">participants</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm">
            <CheckSquare className="h-4 w-4 text-blue-500" />
            <span className="font-semibold text-blue-800">{counts.Submitted + counts.NeedsGrading + counts.Graded}</span>
            <span className="text-blue-600">submitted</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="font-semibold text-amber-800">{counts.NeedsGrading}</span>
            <span className="text-amber-600">needs grading</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm">
            <CheckSquare className="h-4 w-4 text-emerald-500" />
            <span className="font-semibold text-emerald-800">{counts.Graded}</span>
            <span className="text-emerald-600">graded</span>
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
