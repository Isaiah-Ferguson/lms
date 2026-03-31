"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { adminParticipantsApi, ApiError } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import type { AdminNotes } from "@/lib/profile-data";

interface AdminNotesCardProps {
  userId: string;
  userName: string;
  adminNotes: AdminNotes;
  canEditAdminNotes: boolean;
  onSave: (text: string) => void;
}

function formatDateTime(dateIso: string): string {
  return new Date(dateIso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminNotesCard({ userId, userName, adminNotes, canEditAdminNotes, onSave }: AdminNotesCardProps) {
  const [text, setText] = useState(adminNotes.text);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showPreviousNotes, setShowPreviousNotes] = useState(false);

  async function handleExportPreviousNotes() {
    if (adminNotes.previousNotes.length === 0) {
      return;
    }

    const token = getToken();
    if (!token) {
      setExportError("You must be signed in to export notes.");
      return;
    }

    setExportError(null);
    setExporting(true);

    try {
      const { blob, fileName } = await adminParticipantsApi.exportPreviousNotesDocx(
        userId,
        {
          userName,
          previousNotes: adminNotes.previousNotes,
        },
        token
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof ApiError ? error.detail : "Failed to export previous notes.");
    } finally {
      setExporting(false);
    }
  }

  async function handleSave() {
    if (!canEditAdminNotes) {
      return;
    }

    const token = getToken();
    if (!token) {
      setSaveError("You must be signed in to save notes.");
      return;
    }

    setSaveError(null);
    setSaving(true);
    try {
      await adminParticipantsApi.saveAdminNote(userId, text.trim(), token);
      onSave(text.trim());
      setText("");
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.detail : "Failed to save notes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProfileCard
      title="Admin Notes"
      description={`Last updated ${formatDateTime(adminNotes.updatedAt)} by ${adminNotes.updatedBy}`}
    >
      <div className="space-y-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={6}
          disabled={!canEditAdminNotes}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-blue-500/20 focus:border-blue-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-50"
        />
        <Button size="sm" onClick={handleSave} loading={saving} disabled={!canEditAdminNotes}>
          Save notes
        </Button>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        <div className="border-t border-gray-200 pt-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPreviousNotes((prev) => !prev)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              {showPreviousNotes ? "Hide previous notes" : "View previous notes"}
            </button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExportPreviousNotes}
              loading={exporting}
              disabled={adminNotes.previousNotes.length === 0}
            >
              Export previous notes (.docx)
            </Button>
          </div>

          {exportError && <p className="text-sm text-red-600">{exportError}</p>}

          {showPreviousNotes && (
            <div className="mt-3 space-y-3">
              {adminNotes.previousNotes.length === 0 ? (
                <p className="text-sm text-gray-500">No previous notes available.</p>
              ) : (
                adminNotes.previousNotes.map((note) => (
                  <div key={`${note.updatedAt}-${note.updatedBy}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-sm text-gray-800">{note.text}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      {formatDateTime(note.updatedAt)} by {note.updatedBy}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </ProfileCard>
  );
}
