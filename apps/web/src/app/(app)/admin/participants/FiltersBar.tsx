"use client";

import { Search } from "lucide-react";
import type { UserRole, UserStatus, CourseOption } from "@/lib/admin-participants-data";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  roleFilter: UserRole | "All";
  onRoleChange: (v: UserRole | "All") => void;
  statusFilter: UserStatus | "All";
  onStatusChange: (v: UserStatus | "All") => void;
  yearFilter: string;
  onYearChange: (v: string) => void;
  courses: CourseOption[];
  totalCount: number;
  filteredCount: number;
}

export function FiltersBar({
  search, onSearchChange,
  roleFilter, onRoleChange,
  statusFilter, onStatusChange,
  yearFilter, onYearChange,
  courses,
  totalCount, filteredCount,
}: Props) {
  // Get unique years from courses
  const years = Array.from(new Set(courses.map(c => c.yearId)))
    .map(yearId => {
      const course = courses.find(c => c.yearId === yearId);
      return { id: yearId, label: course?.yearLabel || yearId };
    });
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <label htmlFor="participant-search" className="sr-only">Search participants</label>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          id="participant-search"
          type="text"
          placeholder="Search name, username, email…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Role filter */}
        <label htmlFor="role-filter" className="sr-only">Filter by role</label>
        <select
          id="role-filter"
          value={roleFilter}
          onChange={(e) => onRoleChange(e.target.value as UserRole | "All")}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="All">All roles</option>
          <option value="Student">Student</option>
          <option value="Instructor">Instructor</option>
          <option value="Admin">Admin</option>
        </select>

        {/* Status filter */}
        <label htmlFor="status-filter" className="sr-only">Filter by status</label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as UserStatus | "All")}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="All">All statuses</option>
          <option value="Active">Active</option>
          <option value="Disabled">Disabled</option>
        </select>

        {/* Year/Level filter */}
        <label htmlFor="year-filter" className="sr-only">Filter by year/level</label>
        <select
          id="year-filter"
          value={yearFilter}
          onChange={(e) => onYearChange(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="All">All years</option>
          {years.map(year => (
            <option key={year.id} value={year.id}>
              {year.label}
            </option>
          ))}
        </select>

        {/* Count */}
        <span className="whitespace-nowrap text-xs text-gray-600">
          {filteredCount} / {totalCount}
        </span>
      </div>
    </div>
  );
}
