"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { CourseLevel } from "@/lib/dashboard-home-data";
import { ApiError, homeApi } from "@/lib/api-client";
import { getToken } from "@/lib/auth";

interface EditLevelModalProps {
  level: CourseLevel;
  yearLabel: string;
  onClose: () => void;
  onSaved: (description: string) => void;
}

export function EditLevelModal({ level, yearLabel, onClose, onSaved }: EditLevelModalProps) {
  const [description, setDescription] = useState(level.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function handleSave() {
    const token = getToken();
    if (!token) {
      setError("Your session expired. Please sign in again.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await homeApi.updateLevelDescription(level.id, description.trim(), token);
      onSaved(updated.description);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save description.");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-level-title"
        className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 id="edit-level-title" className="text-base font-semibold text-gray-900 dark:text-slate-100">
              Edit {level.title}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">{yearLabel}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="ml-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          <div>
            <label
              htmlFor="level-description"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400"
            >
              Description
            </label>
            <textarea
              id="level-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Describe what this level covers..."
              className="block w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500"
            />
            <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">
              Updates {yearLabel} only — existing years aren&apos;t affected. New years you
              create inherit descriptions from your most recent year.
            </p>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-slate-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Description"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
