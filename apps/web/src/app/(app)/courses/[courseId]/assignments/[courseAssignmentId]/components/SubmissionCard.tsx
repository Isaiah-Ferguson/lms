"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Upload, RefreshCw, Download, X } from "lucide-react";
import { submissionsApi, uploadFileToBlobSas } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { SubmissionGuidelinesModal } from "@/components/submissions/SubmissionGuidelinesModal";

export interface SubmissionState {
  status: "NotSubmitted" | "Submitted";
  submittedAt: string | null;
  fileName: string | null;
  fileSize: number | null;
  submissionId?: string | null;
}

interface SubmissionCardProps {
  courseAssignmentId: string;
  initial: SubmissionState;
}

// ── Real 3-step SAS upload ─────────────────────────────────────────────────
// Step 1: POST /api/submissions/{id}/request-upload  → get SAS URL
// Step 2: PUT {sasUrl}                               → upload directly to Azure
// Step 3: POST /api/submissions/{submissionId}/complete-upload → confirm
async function uploadZip(
  courseAssignmentId: string,
  file: File,
  figmaUrl: string | null,
  githubRepoUrl: string | null,
  hostedUrl: string | null,
  note: string | null,
  onProgress: (pct: number) => void
): Promise<{ submissionId: string }> {
  const token = getToken();
  if (!token) throw new Error("Session expired — please log in again.");

  // Step 1 — request upload slot
  const uploadResp = await submissionsApi.requestUpload(
    courseAssignmentId,
    [{ fileName: file.name, contentType: "application/zip", sizeBytes: file.size }],
    token,
    figmaUrl,
    githubRepoUrl,
    hostedUrl,
    note
  );

  const slot = uploadResp.uploadSlots[0];

  // Step 2 — PUT directly to Azure Blob via SAS URL (real progress events)
  await uploadFileToBlobSas(slot.sasUrl, file, "application/zip", onProgress);

  // Step 3 — tell the backend the upload is done
  await submissionsApi.completeUpload(
    uploadResp.submissionId,
    [{
      blobPath: slot.blobPath,
      fileName: file.name,
      contentType: "application/zip",
      sizeBytes: file.size,
      checksum: "",
    }],
    token
  );

  return { submissionId: uploadResp.submissionId };
}
// ──────────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SubmissionCard({ courseAssignmentId, initial }: SubmissionCardProps) {
  const [state, setState] = useState<SubmissionState>(initial);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showUploader, setShowUploader] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [hostedUrl, setHostedUrl] = useState("");
  const [note, setNote] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFileError(null);
    setSelectedFile(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setFileError("Only .zip files are allowed.");
      return;
    }
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) { setFileError("Please select a .zip file."); return; }
    setUploading(true);
    setProgress(0);
    setFileError(null);
    try {
      const result = await uploadZip(
        courseAssignmentId,
        selectedFile,
        figmaUrl || null,
        githubRepoUrl || null,
        hostedUrl || null,
        note || null,
        setProgress
      );
      setState({
        status: "Submitted",
        submittedAt: new Date().toISOString(),
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        submissionId: result.submissionId,
      });
      setShowUploader(false);
      setSelectedFile(null);
      setFigmaUrl("");
      setGithubRepoUrl("");
      setHostedUrl("");
      setNote("");
      setToast(`${selectedFile.name} submitted successfully!`);
    } catch {
      setFileError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function handleDownload() {
    if (!state.submissionId) {
      setDownloadError("No submission ID found");
      return;
    }
    
    setDownloading(true);
    setDownloadError(null);
    try {
      const token = getToken();
      if (!token) throw new Error("Session expired");

      // Get artifacts with download URLs
      const artifactList = await submissionsApi.getArtifacts(state.submissionId, token);
      
      if (!artifactList.artifacts || artifactList.artifacts.length === 0) {
        throw new Error("No files available for download");
      }

      // Download the first artifact (ZIP file)
      const artifact = artifactList.artifacts[0];
      const response = await fetch(artifact.downloadUrl);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = artifact.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setDownloadError("Failed to download: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setDownloading(false);
    }
  }

  function handleCancelUpload() {
    setShowUploader(false);
    setSelectedFile(null);
    setFileError(null);
    setProgress(0);
    setFigmaUrl("");
    setGithubRepoUrl("");
    setHostedUrl("");
    setNote("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      {/* Success toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-green-200 bg-green-600 px-5 py-3.5 text-sm font-medium text-white shadow-xl animate-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {toast}
          <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <h2 className="text-sm font-semibold text-gray-900">My Submission</h2>

      {/* Submitted status */}
      {state.status === "Submitted" && state.submittedAt && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-medium text-green-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Submitted
          </div>
          <p className="text-xs text-green-700">
            {new Date(state.submittedAt).toLocaleString()}
            {state.fileName && (
              <> · <span className="font-medium">{state.fileName}</span></>
            )}
            {state.fileSize != null && (
              <> ({formatBytes(state.fileSize)})</>
            )}
          </p>
          {/* Download submitted ZIP */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1 text-xs font-medium text-green-900 underline underline-offset-2 hover:text-green-700 disabled:opacity-50"
          >
            <Download className="h-3 w-3" />
            {downloading ? "Downloading..." : "Download submitted ZIP"}
          </button>
          {downloadError && (
            <p className="text-xs text-red-600">{downloadError}</p>
          )}
        </div>
      )}

      {/* Upload area */}
      {showUploader ? (
        <div className="space-y-3">
          <label className="block">
            <span className="sr-only">Choose ZIP file</span>
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={handleFileChange}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700
                file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-2.5
                file:py-1.5 file:text-xs file:font-medium file:text-gray-600 hover:file:bg-gray-200"
            />
          </label>

          {/* External URL fields */}
          <div className="space-y-2">
            <div>
              <label htmlFor="FigmaUrl" className="block text-xs font-medium text-gray-700 mb-1">
                Figma URL (optional)
              </label>
              <input
                id="FigmaUrl"
                type="url"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                placeholder="https://figma.com/file/..."
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="GithubURL" className="block text-xs font-medium text-gray-700 mb-1">
                GitHub Repo URL (optional)
              </label>
              <input
                id="GithubURL"
                type="url"
                value={githubRepoUrl}
                onChange={(e) => setGithubRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repo"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="HostedURL" className="block text-xs font-medium text-gray-700 mb-1">
                Hosted URL (optional)
              </label>
              <input
              id="HostedURL"
                type="url"
                value={hostedUrl}
                onChange={(e) => setHostedUrl(e.target.value)}
                placeholder="https://your-app.vercel.app"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="CommentField" className="block text-xs font-medium text-gray-700 mb-1">
                Note / Comment (optional)
              </label>
              <textarea
              id="CommentField"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any notes or comments about your submission..."
                rows={3}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {selectedFile && !fileError && (
            <p className="text-xs text-gray-500">
              <span className="font-medium">{selectedFile.name}</span> · {formatBytes(selectedFile.size)}
            </p>
          )}

          {fileError && (
            <p className="text-xs text-red-600">{fileError}</p>
          )}

          {uploading && (
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">Uploading… {progress}%</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!guidelinesAccepted) {
                  setShowGuidelines(true);
                } else {
                  handleUpload();
                }
              }}
              disabled={uploading || !selectedFile}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading…" : "Upload ZIP"}
            </button>
            <button
              onClick={handleCancelUpload}
              disabled={uploading}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // Only show submit button if not already submitted (one submission per assignment)
        state.status === "NotSubmitted" && (
          <button
            onClick={() => setShowUploader(true)}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Upload className="h-3.5 w-3.5" /> Submit ZIP
          </button>
        )
      )}

      {/* Submission Guidelines Modal */}
      <SubmissionGuidelinesModal
        isOpen={showGuidelines}
        onClose={() => setShowGuidelines(false)}
        onAccept={() => {
          setGuidelinesAccepted(true);
          setShowGuidelines(false);
          handleUpload();
        }}
      />
    </div>
  );
}
