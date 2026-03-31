"use client";

import { useState } from "react";
import { assignmentsApi, type CreateAssignmentRequest, type Assignment } from "@/lib/api-client";
import { getToken } from "@/lib/auth";

export type AssignmentType = "MiniChallenge" | "Challenge" | "Project";

interface CreateAssignmentFormProps {
  moduleId: string;
  moduleTitle: string;
  existingAssignment?: Assignment;
  onAssignmentCreated?: (assignment: Assignment, type: AssignmentType) => void;
  onCancel?: () => void;
}

export function CreateAssignmentForm({
  moduleId,
  moduleTitle,
  existingAssignment,
  onAssignmentCreated,
  onCancel,
}: CreateAssignmentFormProps) {
  const [formData, setFormData] = useState<CreateAssignmentRequest>({
    title: existingAssignment?.title ?? "",
    assignmentType: existingAssignment?.assignmentType ?? "Challenge",
    instructions: existingAssignment?.instructions ?? "",
    dueDate: existingAssignment?.dueDate ? new Date(existingAssignment.dueDate).toISOString().slice(0, 16) : "",
    rubricJson: existingAssignment?.rubricJson ?? "[]",
    moduleId: existingAssignment?.moduleId ?? moduleId,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) throw new Error("Session expired");

      let assignment: Assignment;
      if (existingAssignment) {
        assignment = await assignmentsApi.updateAssignment(existingAssignment.id, formData, token);
      } else {
        assignment = await assignmentsApi.createAssignment(formData, token);
      }
      onAssignmentCreated?.(assignment, formData.assignmentType as AssignmentType);

      if (!existingAssignment) {
        setFormData({ title: "", assignmentType: "Challenge", instructions: "", dueDate: "", rubricJson: "[]", moduleId });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${existingAssignment ? 'update' : 'create'} assignment`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CreateAssignmentRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Assignment Title
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="assignmentType" className="block text-sm font-medium text-gray-700">
            Type
          </label>
          <select
            id="assignmentType"
            value={formData.assignmentType}
            onChange={(e) => handleInputChange("assignmentType", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
          >
            <option value="MiniChallenge">Mini Challenge</option>
            <option value="Challenge">Challenge</option>
            <option value="Project">Project</option>
          </select>
        </div>

        <div>
          <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">
            Instructions
          </label>
          <textarea
            id="instructions"
            value={formData.instructions}
            onChange={(e) => handleInputChange("instructions", e.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
            Due Date
          </label>
          <input
            type="datetime-local"
            id="dueDate"
            value={formData.dueDate}
            onChange={(e) => handleInputChange("dueDate", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="rubricJson" className="block text-sm font-medium text-gray-700">
            Rubric <span className="text-gray-400 font-normal">(JSON, optional)</span>
          </label>
          <textarea
            id="rubricJson"
            value={formData.rubricJson}
            onChange={(e) => handleInputChange("rubricJson", e.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-xs"
            placeholder='[{"criterion": "Code quality", "points": 10, "description": "..."}]'
          />
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (existingAssignment ? "Updating…" : "Creating…") : (existingAssignment ? "Update Assignment" : "Create Assignment")}
          </button>
        </div>
      </form>
    </div>
  );
}
