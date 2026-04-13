import Link from "next/link";
import type { AssignmentSubmissionsRosterData, AssignmentRosterStatus } from "@/lib/assignment-submissions-roster";
import { formatDateTime } from "@/lib/date-utils";

type RosterRow = AssignmentSubmissionsRosterData["rows"][number];

interface RosterTableProps {
  rows: RosterRow[];
  dueDate: string | null;
  onGradeClick: (row: RosterRow) => void;
}

function statusBadge(status: AssignmentRosterStatus): React.ReactNode {
  const map: Record<AssignmentRosterStatus, { label: string; cls: string }> = {
    NotSubmitted: { label: "Not Submitted", cls: "bg-gray-100 text-gray-600" },
    Submitted:    { label: "Submitted",     cls: "bg-blue-100 text-blue-700" },
    NeedsGrading: { label: "Needs Grading", cls: "bg-amber-100 text-amber-700" },
    Graded:       { label: "Graded",        cls: "bg-emerald-100 text-emerald-700" },
    Returned:     { label: "Returned",      cls: "bg-red-100 text-red-700" },
  };
  const { label, cls } = map[status] ?? map.NotSubmitted;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function gradeDisplay(grade: string | null): React.ReactNode {
  if (!grade) return <span className="text-gray-400">—</span>;
  // colour by percentage
  const pctMatch = grade.match(/(\d+)\s*(?:\/\s*(\d+)|%)/);
  let pct: number | null = null;
  if (pctMatch) {
    const num = parseFloat(pctMatch[1]);
    const den = pctMatch[2] ? parseFloat(pctMatch[2]) : 100;
    pct = Math.round((num / den) * 100);
  }
  const cls =
    pct === null ? "text-gray-700" :
    pct >= 90    ? "text-emerald-700 font-semibold" :
    pct >= 75    ? "text-blue-700 font-semibold" :
    pct >= 60    ? "text-amber-700 font-semibold" :
                   "text-red-700 font-semibold";
  return <span className={cls}>{grade}</span>;
}

function formatDate(value: string | null): React.ReactNode {
  if (!value) return <span className="text-gray-400">—</span>;
  return formatDateTime(value);
}

function isPastDue(submittedAt: string | null, dueDate: string | null): boolean {
  if (!submittedAt || !dueDate) return false;
  return new Date(submittedAt) > new Date(dueDate);
}

export function RosterTable({ rows, dueDate, onGradeClick }: RosterTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Submitted At</th>
              <th className="px-4 py-3 font-semibold">Grade</th>
              <th className="px-4 py-3 font-semibold">Graded By</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  No students match the current filters.
                </td>
              </tr>
            )}

            {rows.map((row) => {
              const pastDue = isPastDue(row.submittedAt, dueDate);
              return (
                <tr key={row.user.id} className="align-middle hover:bg-gray-50/60">
                  {/* Student */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{row.user.name}</p>
                    <p className="text-xs text-gray-400">@{row.user.username}</p>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-xs text-gray-500">{row.user.email}</td>

                  {/* Status */}
                  <td className="px-4 py-3">{statusBadge(row.status)}</td>

                  {/* Submitted At — red if past due */}
                  <td className="px-4 py-3">
                    {row.submittedAt ? (
                      <span className={pastDue ? "font-medium text-red-600" : "text-gray-600"}>
                        {formatDateTime(row.submittedAt)}
                        {pastDue && (
                          <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                            Late
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  {/* Grade */}
                  <td className="px-4 py-3">{gradeDisplay(row.grade)}</td>

                  {/* Graded By */}
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {row.gradedBy ? (
                      <span>{row.gradedBy}
                        {row.gradedAt && (
                          <span className="block text-gray-400">{formatDate(row.gradedAt)}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    {row.submissionId ? (
                      <div className="flex gap-2">
                        {row.status !== "Returned" && (
                          <button
                            onClick={() => onGradeClick(row)}
                            className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors
                              ${row.status === "NeedsGrading"
                                ? "bg-amber-500 text-white hover:bg-amber-600"
                                : row.status === "Graded"
                                  ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                  : "border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                              }`}
                          >
                            {row.status === "Graded" ? "Edit Grade" : "Grade"}
                          </button>
                        )}
                        <Link
                          href={`/instructor/submissions/${row.submissionId}`}
                          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          View Details
                        </Link>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
