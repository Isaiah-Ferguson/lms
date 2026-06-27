import { Video, ExternalLink } from "lucide-react";

export function ClassLinkCard({ zoomUrl }: { zoomUrl: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 overflow-hidden rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6 shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-md">
        <Video className="h-7 w-7 text-white" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Live Class</p>
        <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">Join via Zoom</p>
      </div>
      <a
        href={zoomUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Join class
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
