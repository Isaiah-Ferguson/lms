"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { assignmentsApi } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import type { LevelWeek } from "../LevelDashboardClient";

interface CreateAssignmentModalProps {
  isOpen: boolean;
  courseId: string;
  weeks: LevelWeek[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateAssignmentModal({
  isOpen,
  courseId,
  weeks,
  onClose,
  onCreated,
}: CreateAssignmentModalProps) {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [assignmentType, setAssignmentType] = useState("Challenge");
  const [dueDate, setDueDate] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Reset form
      setTitle("");
      setInstructions("");
      setAssignmentType("Challenge");
      setDueDate("");
      setAttachmentUrl("");
      setSelectedWeekId(weeks.length > 0 ? weeks[0].id || "" : "");
      setError(null);
    } else {
      setMounted(false);
    }
  }, [isOpen, weeks]);

  if (!isOpen || !mounted) {
    return null;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    
    if (!instructions.trim()) {
      setError("Instructions are required");
      return;
    }
    
    if (!dueDate) {
      setError("Due date is required");
      return;
    }
    
    if (!selectedWeekId) {
      setError("Please select a week");
      return;
    }

    const token = getToken();
    if (!token) {
      setError("Session expired");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Convert datetime-local to UTC ISO string
      const localDate = new Date(dueDate);
      
      await assignmentsApi.createAssignment(
        {
          title: title.trim(),
          assignmentType,
          instructions: instructions.trim(),
          dueDate: localDate.toISOString(),
          attachmentUrl: attachmentUrl.trim() || undefined,
          moduleId: selectedWeekId,
        },
        token
      );
      
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create assignment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/45 dark:bg-black/60 backdrop-blur-sm px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Create Assignment</h2>
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
              placeholder="e.g. Build a Landing Page"
              required
              className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
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
              placeholder="Describe the assignment requirements..."
              rows={8}
              required
              className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="AssignmentType" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Type
              </label>
              <select
                id="AssignmentType"
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
              >
                <option value="MiniChallenge">Mini Challenge</option>
                <option value="Challenge">Challenge</option>
                <option value="Project">Project</option>
              </select>
            </div>

            <div>
              <label htmlFor="DueDate" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Due Date
              </label>
              <input
                id="DueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="WeekSelect" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Week
            </label>
            <select
              id="WeekSelect"
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              required
              className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
            >
              <option value="">Select a week...</option>
              {weeks.map((week) => (
                <option key={week.id} value={week.id}>
                  Week {week.weekNumber} - {week.title}
                </option>
              ))}
            </select>
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
              className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
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
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
