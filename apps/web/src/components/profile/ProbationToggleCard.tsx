"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { adminParticipantsApi, ApiError } from "@/lib/api-client";
import { getToken } from "@/lib/auth";

interface ProbationToggleCardProps {
  userId: string;
  initialIsOnProbation: boolean;
  initialReason: string;
  onSave: (isOnProbation: boolean, reason: string) => void;
}

export function ProbationToggleCard({
  userId,
  initialIsOnProbation,
  initialReason,
  onSave,
}: ProbationToggleCardProps) {
  const [isOnProbation, setIsOnProbation] = useState(initialIsOnProbation);
  const [reason, setReason] = useState(initialReason);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function handleSave() {
    const token = getToken();
    if (!token) {
      setSaveError("You must be signed in.");
      return;
    }

    if (isOnProbation && !reason.trim()) {
      setSaveError("A reason is required when placing a student on academic probation.");
      return;
    }

    setSaveError(null);
    setSaveSuccess(false);
    setSaving(true);
    try {
      await adminParticipantsApi.setProbationStatus(userId, isOnProbation, reason.trim(), token);
      onSave(isOnProbation, isOnProbation ? reason.trim() : "");
      setReason("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.detail : "Failed to update probation status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProfileCard
      title="Academic Probation"
      description="Toggle probation status and provide a reason visible to the student."
    >
      <div className="space-y-4">
        {/* Toggle row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={`h-4 w-4 ${isOnProbation ? "text-red-500" : "text-gray-400"}`}
            />
            <span className="text-sm font-medium text-gray-700">
              {isOnProbation ? "On academic probation" : "Not on academic probation"}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isOnProbation}
            onClick={() => setIsOnProbation((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/40 ${
              isOnProbation ? "bg-red-500" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                isOnProbation ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Reason input — only shown when probation is on */}
        {isOnProbation && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Reason <span className="text-red-500">*</span> <span className="text-gray-400">(shown to student)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Missing multiple deadlines and class sessions."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-red-500/20 focus:border-red-500 focus:ring-2"
            />
          </div>
        )}

        <Button
          size="sm"
          onClick={handleSave}
          loading={saving}
          className={isOnProbation ? "bg-red-600 hover:bg-red-700 focus:ring-red-500/40" : ""}
        >
          Save status
        </Button>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        {saveSuccess && <p className="text-sm text-green-600">Probation status updated.</p>}
      </div>
    </ProfileCard>
  );
}
