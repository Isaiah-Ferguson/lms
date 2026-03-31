"use client";

import { Users, CheckSquare, Clock } from "lucide-react";

export interface ParticipationCounts {
  participants: number;
  submitted: number;
  needsGrading?: number;
}

interface ParticipationCardProps {
  counts: ParticipationCounts;
  isInstructor: boolean;
}

interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

function StatPill({ icon, label, value, color }: StatPillProps) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${color}`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="mt-0.5 text-xs">{label}</p>
      </div>
    </div>
  );
}

export function ParticipationCard({ counts, isInstructor }: ParticipationCardProps) {
  const submitPct =
    counts.participants > 0
      ? Math.round((counts.submitted / counts.participants) * 100)
      : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Participation</h2>

      <div className="grid grid-cols-2 gap-3">
        <StatPill
          icon={<Users className="h-4 w-4 text-gray-500" />}
          label="Participants"
          value={counts.participants}
          color="border-gray-100 bg-gray-50 text-gray-700"
        />
        <StatPill
          icon={<CheckSquare className="h-4 w-4 text-blue-500" />}
          label="Submitted"
          value={counts.submitted}
          color="border-blue-100 bg-blue-50 text-blue-700"
        />
        {isInstructor && counts.needsGrading != null && (
          <StatPill
            icon={<Clock className="h-4 w-4 text-amber-500" />}
            label="Needs grading"
            value={counts.needsGrading}
            color="border-amber-100 bg-amber-50 text-amber-700"
          />
        )}
      </div>

      {counts.participants > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Submission rate</span>
            <span className="font-medium">{submitPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${submitPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
