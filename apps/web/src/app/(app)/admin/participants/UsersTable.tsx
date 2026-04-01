"use client";

import Link from "next/link";
import { Check, Pencil, UserPlus, ShieldCheck, ShieldOff, UserCog, Ban, CheckCircle } from "lucide-react";
import { clsx } from "clsx";
import type { ParticipantUser, CourseOption } from "@/lib/admin-participants-data";

interface Props {
  users: ParticipantUser[];
  courses: CourseOption[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEnroll: (user: ParticipantUser) => void;
  onToggleAdmin: (user: ParticipantUser) => void;
  onToggleActive: (user: ParticipantUser) => void;
  onImpersonate: (user: ParticipantUser) => void;
}

function fmtDate(iso: string | null) {
  if (!iso) return <span className="text-gray-300">Never</span>;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function CourseChips({ enrollments, courses }: { enrollments: string[]; courses: CourseOption[] }) {
  if (enrollments.length === 0)
    return <span className="text-xs text-gray-300">None</span>;
  
  // Get the labels for enrolled courses
  const enrolledLabels = enrollments
    .map((id) => courses.find((c) => c.id === id)?.label)
    .filter((label): label is string => !!label);
  
  if (enrolledLabels.length === 0) {
    return <span className="text-xs text-gray-300">None</span>;
  }
  
  // Define level hierarchy by label (highest to lowest)
  const levelOrder = ["Level 4", "Level 3", "Level 2", "Level 1", "Combine"];
  
  // Find the highest level enrolled by checking labels
  const highestLabel = levelOrder.find((level) => 
    enrolledLabels.some((enrolled) => enrolled.toLowerCase().includes(level.toLowerCase()))
  );
  
  const displayLabel = highestLabel || enrolledLabels[0];
  
  return (
    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
      {displayLabel}
    </span>
  );
}

export function UsersTable({
  users, courses, selectedIds,
  onToggleSelect, onToggleSelectAll,
  onEnroll, onToggleAdmin, onToggleActive, onImpersonate,
}: Props) {
  const allSelected = users.length > 0 && selectedIds.length === users.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {/* Checkbox */}
              <th className="w-10 px-4 py-3">
                <button
                  onClick={onToggleSelectAll}
                  className={clsx(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    allSelected
                      ? "border-blue-500 bg-blue-500"
                      : someSelected
                      ? "border-blue-400 bg-blue-100"
                      : "border-gray-300 bg-white"
                  )}
                >
                  {(allSelected || someSelected) && (
                    <Check className="h-2.5 w-2.5 text-blue-600" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Username</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Enrollments</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Last login</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">
                  No users match your filters.
                </td>
              </tr>
            )}
            {users.map((u) => {
              const selected = selectedIds.includes(u.id);
              return (
                <tr
                  key={u.id}
                  className={clsx(
                    "transition-colors hover:bg-gray-50",
                    selected && "bg-blue-50 hover:bg-blue-50"
                  )}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onToggleSelect(u.id)}
                      className={clsx(
                        "flex h-4 w-4 items-center justify-center rounded border",
                        selected ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white"
                      )}
                    >
                      {selected && <Check className="h-2.5 w-2.5 text-white" />}
                    </button>
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={`${u.firstName} ${u.lastName}`}
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                          {u.avatarInitials}
                        </div>
                      )}
                      <div>
                        <Link
                          href={`/admin/participants/${u.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                        >
                          {u.firstName} {u.lastName}
                        </Link>
                        <p className="text-xs text-gray-400">{u.town}</p>
                      </div>
                    </div>
                  </td>

                  {/* Username */}
                  <td className="px-4 py-3 text-gray-600">{u.username}</td>

                  {/* Email */}
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <span className={clsx(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      u.role === "Admin"
                        ? "bg-violet-100 text-violet-700"
                        : u.role === "Instructor"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                    )}>
                      {u.role}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={clsx(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      u.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    )}>
                      <span className={clsx(
                        "h-1.5 w-1.5 rounded-full",
                        u.status === "Active" ? "bg-green-500" : "bg-red-400"
                      )} />
                      {u.status}
                    </span>
                  </td>

                  {/* Enrollments */}
                  <td className="px-4 py-3">
                    <CourseChips enrollments={u.enrollments} courses={courses} />
                  </td>

                  {/* Last login */}
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {fmtDate(u.lastLoginAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/participants/${u.id}`}
                        title="Edit"
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <ActionBtn
                        icon={<UserPlus className="h-3.5 w-3.5" />}
                        label="Enroll"
                        onClick={() => onEnroll(u)}
                      />
                      <ActionBtn
                        icon={
                          u.role === "Admin"
                            ? <ShieldOff className="h-3.5 w-3.5" />
                            : <ShieldCheck className="h-3.5 w-3.5" />
                        }
                        label={u.role === "Admin" ? "Remove admin" : "Make admin"}
                        onClick={() => onToggleAdmin(u)}
                        className={u.role === "Admin" ? "text-red-400 hover:text-red-600 hover:bg-red-50" : ""}
                      />
                      <ActionBtn
                        icon={
                          u.status === "Active"
                            ? <Ban className="h-3.5 w-3.5" />
                            : <CheckCircle className="h-3.5 w-3.5" />
                        }
                        label={u.status === "Active" ? "Deactivate account" : "Activate account"}
                        onClick={() => onToggleActive(u)}
                        className={u.status === "Active" ? "text-red-400 hover:text-red-600 hover:bg-red-50" : "text-green-500 hover:text-green-700 hover:bg-green-50"}
                      />
                      <ActionBtn
                        icon={<UserCog className="h-3.5 w-3.5" />}
                        label="Impersonate"
                        onClick={() => onImpersonate(u)}
                        className="text-yellow-500 hover:text-yellow-700 hover:bg-yellow-50"
                      />
                    </div>
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

function ActionBtn({
  icon, label, onClick, className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={clsx(
        "rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors",
        className
      )}
    >
      {icon}
    </button>
  );
}
