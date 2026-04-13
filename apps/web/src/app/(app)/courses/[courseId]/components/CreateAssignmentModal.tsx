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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/45 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Create Assignment</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5 px-6 py-5">
          <div>
            <label htmlFor="AssignmentTitle" className="mb-1 block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              id="AssignmentTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build a Landing Page"
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="AssignmentInstructions" className="mb-1 block text-sm font-medium text-gray-700">
              Instructions
            </label>
            <textarea
              id="AssignmentInstructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Describe the assignment requirements..."
              rows={8}
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="AssignmentType" className="mb-1 block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                id="AssignmentType"
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="MiniChallenge">Mini Challenge</option>
                <option value="Challenge">Challenge</option>
                <option value="Project">Project</option>
              </select>
            </div>

            <div>
              <label htmlFor="DueDate" className="mb-1 block text-sm font-medium text-gray-700">
                Due Date
              </label>
              <input
                id="DueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="WeekSelect" className="mb-1 block text-sm font-medium text-gray-700">
              Week
            </label>
            <select
              id="WeekSelect"
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <label htmlFor="AttachmentUrl" className="mb-1 block text-sm font-medium text-gray-700">
              Attachment URL (optional)
            </label>
            <input
              id="AttachmentUrl"
              type="url"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="https://..."
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
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
