"use client";

import { useState, useEffect } from "react";
import { assignmentsApi, type AssignmentListItem, type Assignment } from "@/lib/api-client";
import { getToken } from "@/lib/auth";

interface AssignmentListProps {
  courseId: string;
  moduleId?: string;
  onAssignmentSelect?: (assignment: Assignment) => void;
  onAssignmentEdit?: (assignment: Assignment) => void;
  onAssignmentDelete?: (assignmentId: string) => void;
  canEdit?: boolean;
}

export function AssignmentList({
  courseId,
  moduleId,
  onAssignmentSelect,
  onAssignmentEdit,
  onAssignmentDelete,
  canEdit = false,
}: AssignmentListProps) {
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load assignments when component mounts
  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const token = getToken();
        if (!token) throw new Error("Session expired");

        const data = moduleId
          ? await assignmentsApi.getAssignmentsByModule(moduleId, token)
          : await assignmentsApi.getAssignmentsByCourse(courseId, token);
        
        setAssignments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load assignments");
      } finally {
        setLoading(false);
      }
    };

    loadAssignments();
  }, [courseId, moduleId]);

  const handleDelete = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;

    try {
      const token = getToken();
      if (!token) throw new Error("Session expired");

      await assignmentsApi.deleteAssignment(assignmentId, token);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      onAssignmentDelete?.(assignmentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete assignment");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-500 dark:text-slate-400">
        Loading assignments...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500 dark:text-slate-400">
        No assignments found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment) => (
        <div
          key={assignment.id}
          className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-base font-medium text-gray-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                  onClick={() => onAssignmentSelect?.(assignment as any)}>
                {assignment.title}
              </h4>
              <div className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                <p>{assignment.moduleTitle} • {assignment.courseTitle}</p>
                <p>Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                <p>{assignment.submissionCount} submissions</p>
              </div>
            </div>

            {canEdit && (
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => onAssignmentEdit?.(assignment as any)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(assignment.id)}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
