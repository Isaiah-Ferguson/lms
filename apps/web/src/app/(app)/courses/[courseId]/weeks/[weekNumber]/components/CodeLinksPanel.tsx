import { Download } from "lucide-react";
import type { WeekVideo } from "@/lib/week-details-data";

interface CodeLinksPanelProps {
  video: WeekVideo;
}

export function CodeLinksPanel({ video }: CodeLinksPanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">Code for Selected Video</h3>
        <p className="text-xs text-gray-500">{video.title}</p>
      </div>

      <ul className="divide-y divide-gray-100">
        {video.codeArtifacts.length === 0 && (
          <li className="px-4 py-6 text-xs text-gray-400">No code artifacts attached yet.</li>
        )}
        {video.codeArtifacts.map((artifact) => (
          <li key={artifact.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm text-gray-700">{artifact.label}</span>
            <a
              href={artifact.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
