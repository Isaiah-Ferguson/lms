"use client";

import { useState, useMemo } from "react";
import { Check, Users } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";
import type { ParticipantUser, CourseOption } from "@/lib/admin-participants-data";

interface Props {
  users: ParticipantUser[];
  selectedIds: string[];
  courses: CourseOption[];
  onClose: () => void;
  onEnrolled: (userIds: string[], courseIds: string[]) => Promise<void>;
}

export function BulkActionsModal({ users, selectedIds, courses, onClose, onEnrolled }: Props) {
  const [checkedUsers, setCheckedUsers]     = useState<string[]>(selectedIds);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");

  const coursesByYear = useMemo(() => {
    const map = new Map<string, { yearId: string; yearLabel: string; courses: CourseOption[] }>();
    for (const course of courses) {
      if (!map.has(course.yearId)) {
        map.set(course.yearId, { yearId: course.yearId, yearLabel: course.yearLabel, courses: [] });
      }
      map.get(course.yearId)!.courses.push(course);
    }
    // Sort years with newest first
    return Array.from(map.values()).sort((a, b) => 
      b.yearLabel.localeCompare(a.yearLabel)
    );
  }, [courses]);

  function toggleUser(id: string) {
    setCheckedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
    setError("");
  }

  function toggleAll() {
    setCheckedUsers((prev) =>
      prev.length === users.length ? [] : users.map((u) => u.id)
    );
  }

  function toggleCourse(id: string) {
    setSelectedCourses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (checkedUsers.length === 0)   { setError("Select at least one user");   return; }
    if (selectedCourses.length === 0) { setError("Select at least one course"); return; }
    setLoading(true);
    setError("");
    try {
      await onEnrolled(checkedUsers, selectedCourses);
    } catch {
      setError("Unable to apply bulk enrollment right now.");
    } finally {
      setLoading(false);
    }
  }

  const allChecked = checkedUsers.length === users.length;

  return (
    <Modal title="Bulk actions — Enroll users" onClose={onClose} width="lg">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* User selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Users
              <span className="ml-1.5 text-xs text-gray-400 dark:text-slate-500">
                ({checkedUsers.length} selected)
              </span>
            </label>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {allChecked ? "Deselect all" : "Select all"}
            </button>
          </div>

          <ul className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-600 divide-y divide-gray-100 dark:divide-slate-700">
            {users.map((u) => {
              const checked = checkedUsers.includes(u.id);
              return (
                <li
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  className={clsx(
                    "flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50",
                    checked && "bg-blue-50 dark:bg-blue-950/30"
                  )}
                >
                  <div className={clsx(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    checked ? "border-blue-500 bg-blue-500" : "border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-900"
                  )}>
                    {checked && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {u.avatarInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-slate-200">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="truncate text-xs text-gray-400 dark:text-slate-500">{u.email}</p>
                  </div>
                  <span className={clsx(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    u.status === "Active" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                  )}>
                    {u.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Course selection grouped by year */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Enroll in courses</label>
          <div className="space-y-6">
            {coursesByYear.map((group, index) => (
              <div 
                key={group.yearId}
                className={clsx(
                  "rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-900/50 p-4",
                  index > 0 && "mt-4"
                )}
              >
                <p className="mb-3 text-sm font-bold text-gray-900 dark:text-slate-100">
                  {group.yearLabel}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {group.courses.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCourse(c.id)}
                      className={clsx(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        selectedCourses.includes(c.id)
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
                          : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                      )}
                    >
                      <div className={clsx(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        selectedCourses.includes(c.id)
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 dark:border-slate-500"
                      )}>
                        {selectedCourses.includes(c.id) && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500">
            <Users className="h-3.5 w-3.5" />
            {checkedUsers.length} user{checkedUsers.length !== 1 ? "s" : ""} ·{" "}
            {selectedCourses.length} course{selectedCourses.length !== 1 ? "s" : ""}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" loading={loading}>Apply</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
