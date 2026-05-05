"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "@/components/ui/Button";
import type { ParticipantUser } from "@/lib/admin-participants-data";

interface Props {
  user: ParticipantUser;
  onClose: () => void;
  onConfirm: (userId: string, reason: string) => void;
}

export function ImpersonateModal({ user, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const [error,  setError]  = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setError("Please provide a reason"); return; }
    if (reason.trim().length < 10) { setError("Reason must be at least 10 characters"); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    onConfirm(user.id, reason.trim());
    setLoading(false);
  }

  return (
    <Modal title="Impersonate user" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning banner */}
        <div className="flex items-start gap-2.5 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          <p className="text-xs text-yellow-800">
            You are about to impersonate another user. All actions taken during this
            session will be logged. Use this only for support or debugging purposes.
          </p>
        </div>

        {/* Target user */}
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {user.avatarInitials}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500">{user.email} · {user.role}</p>
          </div>
        </div>

        {/* Reason */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            Reason <span className="text-gray-400">(required)</span>
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Investigating reported issue with course access…"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(""); }}
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" variant="danger" loading={loading}>
            Start impersonation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
