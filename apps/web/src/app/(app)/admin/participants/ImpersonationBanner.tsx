"use client";

import { UserX, LogOut } from "lucide-react";
import type { ParticipantUser } from "@/lib/admin-participants-data";

interface Props {
  user: ParticipantUser;
  onExit: () => void;
}

export function ImpersonationBanner({ user, onExit }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <UserX className="h-4 w-4 shrink-0 text-yellow-700" />
        <p className="text-sm font-medium text-yellow-900">
          Impersonating{" "}
          <span className="font-bold">
            {user.firstName} {user.lastName}
          </span>
          <span className="ml-1.5 text-yellow-600">({user.email})</span>
        </p>
      </div>
      <button
        onClick={onExit}
        className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-400 bg-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-800 hover:bg-yellow-200"
      >
        <LogOut className="h-3.5 w-3.5" />
        Exit impersonation
      </button>
    </div>
  );
}
