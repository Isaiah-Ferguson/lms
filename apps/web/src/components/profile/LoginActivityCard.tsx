import { ProfileCard } from "@/components/profile/ProfileCard";
import type { LoginActivity } from "@/lib/profile-data";

interface LoginActivityCardProps {
  loginActivity: LoginActivity;
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

export function LoginActivityCard({ loginActivity }: LoginActivityCardProps) {
  return (
    <ProfileCard title="Login Activity" description="Track first and most recent platform access.">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">First site access</dt>
          <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-slate-200">
            {formatDateTime(loginActivity.firstSiteAccessAt)}
          </dd>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Last site access</dt>
          <dd className="mt-1 text-sm font-medium text-gray-800 dark:text-slate-200">
            {formatDateTime(loginActivity.lastSiteAccessAt)}
          </dd>
        </div>
      </dl>
    </ProfileCard>
  );
}
