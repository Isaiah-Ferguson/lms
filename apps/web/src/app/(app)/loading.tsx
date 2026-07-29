import { LoadingState } from "@/components/ui/LoadingState";

/**
 * Shown while the authenticated shell resolves its dashboard fetch, so a slow
 * navigation gives feedback instead of appearing frozen.
 */
export default function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
      <LoadingState message="Loading…" />
    </div>
  );
}
