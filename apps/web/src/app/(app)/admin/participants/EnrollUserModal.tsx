"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Check } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";
import type { ParticipantUser, CourseOption } from "@/lib/admin-participants-data";

interface CoursesByYear {
  yearId: string;
  yearLabel: string;
  courses: CourseOption[];
}

interface Props {
  users: ParticipantUser[];
  courses: CourseOption[];
  preselectedUserId?: string;
  onClose: () => void;
  onEnrolled: (userId: string, courseIds: string[]) => Promise<void>;
}

export function EnrollUserModal({ users, courses, preselectedUserId, onClose, onEnrolled }: Props) {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>(preselectedUserId ?? "");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-populate selected courses when user is selected
  useEffect(() => {
    if (selectedUserId) {
      const user = users.find((u) => u.id === selectedUserId);
      if (user) {
        setSelectedCourses(user.enrollments);
      }
    } else {
      setSelectedCourses([]);
    }
  }, [selectedUserId, users]);

  const filtered = useMemo(() =>
    users.filter((u) => {
      const q = search.toLowerCase();
      return (
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }),
    [users, search]
  );

  const coursesByYear = useMemo((): CoursesByYear[] => {
    const map = new Map<string, CoursesByYear>();
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

  function toggleCourse(id: string) {
    setSelectedCourses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) { setError("Select a user"); return; }
    if (selectedCourses.length === 0) { setError("Select at least one course"); return; }
    setLoading(true);
    setError("");
    try {
      await onEnrolled(selectedUserId, selectedCourses);
    } catch {
      setError("Unable to enroll user right now.");
    } finally {
      setLoading(false);
    }
  }

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <Modal title="Enroll user" onClose={onClose} width="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* User picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300">User</label>

          {selectedUser && !preselectedUserId ? (
            <div className="flex items-center justify-between rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-3 py-2">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                {selectedUser.firstName} {selectedUser.lastName}
                <span className="ml-1.5 text-xs text-blue-500 dark:text-blue-400">({selectedUser.email})</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedUserId("")}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Change
              </button>
            </div>
          ) : preselectedUserId && selectedUser ? (
            <div className="rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 px-3 py-2">
              <span className="text-sm font-medium text-gray-800 dark:text-slate-200">
                {selectedUser.firstName} {selectedUser.lastName}
                <span className="ml-1.5 text-xs text-gray-400 dark:text-slate-500">({selectedUser.email})</span>
              </span>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by name, username or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-9 pr-3 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
                />
              </div>
              <ul className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-600 divide-y divide-gray-100 dark:divide-slate-700">
                {filtered.length === 0 && (
                  <li className="px-3 py-3 text-center text-xs text-gray-400 dark:text-slate-500">No users found</li>
                )}
                {filtered.map((u) => (
                  <li
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={clsx(
                      "flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50",
                      selectedUserId === u.id && "bg-blue-50 dark:bg-blue-950/30"
                    )}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      {u.avatarInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-slate-200">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="truncate text-xs text-gray-400 dark:text-slate-500">{u.email}</p>
                    </div>
                    {selectedUserId === u.id && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Course picker grouped by year */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Courses</label>
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

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" loading={loading}>Enroll</Button>
        </div>
      </form>
    </Modal>
  );
}
