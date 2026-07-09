import { downloadBlob, extractFileName } from "@/lib/utils";
import { ApiError } from "./core";

// ─── Transcript API ───────────────────────────────────────────────────────────

export const transcriptApi = {
  async download(userId: string, _token: string): Promise<void> {
    const res = await fetch(`/api/proxy/api/transcript/${userId}/download`);
    if (!res.ok) throw new ApiError(res.status, "Download failed", "Could not download transcript.");
    const fileName = extractFileName(res.headers.get("Content-Disposition"), `transcript-${userId}.pdf`);
    downloadBlob(await res.blob(), fileName);
  },
};
