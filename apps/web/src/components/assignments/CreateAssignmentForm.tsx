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
  const [formData, setFormData] = useState<CreateAssignmentRequest>(() => {
    // Convert UTC date to local datetime-local format
    let localDueDate = "";
    if (existingAssignment?.dueDate) {
      const date = new Date(existingAssignment.dueDate);
      const offset = date.getTimezoneOffset() * 60000;
      localDueDate = new Date(date.getTime() - offset).toISOString().slice(0, 16);
    }
    
    return {
      title: existingAssignment?.title ?? "",
      assignmentType: existingAssignment?.assignmentType ?? "Challenge",
      instructions: existingAssignment?.instructions ?? "",
      dueDate: localDueDate,
      attachmentUrl: existingAssignment?.attachmentUrl ?? "",
      moduleId: existingAssignment?.moduleId ?? moduleId,
    };
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
        setFormData({ title: "", assignmentType: "Challenge", instructions: "", dueDate: "", attachmentUrl: "", moduleId });
        setSelectedFile(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.zip')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please select a .zip file');
        e.target.value = '';
      }
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            Assignment Title
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:focus:ring-brand-400/20"
            required
          />
        </div>

        <div>
          <label htmlFor="assignmentType" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            Type
          </label>
          <select
            id="assignmentType"
            value={formData.assignmentType}
            onChange={(e) => handleInputChange("assignmentType", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:focus:ring-brand-400/20"
          >
            <option value="MiniChallenge">Mini Challenge</option>
            <option value="Challenge">Challenge</option>
            <option value="Project">Project</option>
          </select>
        </div>

        <div>
          <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            Instructions
          </label>
          <textarea
            id="instructions"
            value={formData.instructions}
            onChange={(e) => handleInputChange("instructions", e.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:focus:ring-brand-400/20"
            required
          />
        </div>

        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            Due Date
          </label>
          <input
            type="datetime-local"
            id="dueDate"
            value={formData.dueDate}
            onChange={(e) => handleInputChange("dueDate", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:focus:ring-brand-400/20"
            required
          />
        </div>

        <div>
          <label htmlFor="attachmentUrl" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            Attachment URL <span className="text-gray-400 dark:text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            id="attachmentUrl"
            value={formData.attachmentUrl}
            onChange={(e) => handleInputChange("attachmentUrl", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:focus:ring-brand-400/20"
            placeholder="https://example.com/file.zip"
          />
        </div>

        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            Or Upload Zip File <span className="text-gray-400 dark:text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            type="file"
            id="file"
            accept=".zip"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-950/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40"
          />
          {selectedFile && (
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">Selected: {selectedFile.name}</p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md border border-transparent bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (existingAssignment ? "Updating…" : "Creating…") : (existingAssignment ? "Update Assignment" : "Create Assignment")}
          </button>
        </div>
      </form>
    </div>
  );
}
