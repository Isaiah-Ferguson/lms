"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { assignmentsApi, type Assignment } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { parseApiDate } from "@/lib/date-utils";

interface EditAssignmentModalProps {
  isOpen: boolean;
  assignment: Assignment;
  onClose: () => void;
  onSaved: (updated: Assignment) => void;
}

export function EditAssignmentModal({
  isOpen,
  assignment,
  onClose,
  onSaved,
}: EditAssignmentModalProps) {
  const [title, setTitle] = useState(assignment.title);
  const [instructions, setInstructions] = useState(assignment.instructions);
  const [assignmentType, setAssignmentType] = useState(assignment.assignmentType);
  const [dueDate, setDueDate] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState(assignment.attachmentUrl || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setTitle(assignment.title);
      setInstructions(assignment.instructions);
      setAssignmentType(assignment.assignmentType);
      setAttachmentUrl(assignment.attachmentUrl || "");
      
      // Convert UTC date to local datetime-local format
      const utcDate = parseApiDate(assignment.dueDate);
      if (utcDate) {
        const offset = utcDate.getTimezoneOffset() * 60000;
        const localISOTime = new Date(utcDate.getTime() - offset).toISOString().slice(0, 16);
        setDueDate(localISOTime);
      }
    } else {
      setMounted(false);
    }
  }, [isOpen, assignment]);

  if (!isOpen || !mounted) {
    return null;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;

    setSaving(true);
    setError(null);

    try {
      // Convert datetime-local to UTC ISO string
      const localDate = new Date(dueDate);
      
      const updated = await assignmentsApi.updateAssignment(
        assignment.id,
        {
          title: title.trim(),
          assignmentType,
          instructions: instructions.trim(),
          dueDate: localDate.toISOString(),
          attachmentUrl: attachmentUrl.trim() || undefined,
        },
        token
      );
      
      onSaved(updated);
      onClose();
    } catch (err) {
      setError("Failed to save assignment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/45 dark:bg-black/60 backdrop-blur-sm px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Edit Assignment</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5 px-6 py-5">
          <div>
            <label htmlFor="AssignmentTitle" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Title
            </label>
            <input
              id="AssignmentTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>

          <div>
            <label htmlFor="AssignmentInstructions" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Instructions
            </label>
            <textarea
              id="AssignmentInstructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={8}
              required
              className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="AssignmentTypeEdit" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Type
              </label>
              <select
                id="AssignmentTypeEdit"
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="MiniChallenge">Mini Challenge</option>
                <option value="Challenge">Challenge</option>
                <option value="Project">Project</option>
              </select>
            </div>

            <div>
              <label htmlFor="DueDateEdit" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Due Date
              </label>
              <input
                id="DueDateEdit"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="AttachmentUrl" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Attachment URL (optional)
            </label>
            <input
              id="AttachmentUrl"
              type="url"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="https://..."
              className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-slate-700 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
