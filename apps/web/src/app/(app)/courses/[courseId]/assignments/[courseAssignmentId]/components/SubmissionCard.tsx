"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Upload, Download, X, AlertCircle, Github, ExternalLink } from "lucide-react";
import { submissionsApi, uploadFileToBlobSas } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { SubmissionGuidelinesModal } from "@/components/submissions/SubmissionGuidelinesModal";
import { formatDateTime } from "@/lib/date-utils";
import { formatBytes, downloadFromUrl } from "@/lib/utils";

export type SubmissionMode = "Upload" | "GitHub";

export interface SubmissionState {
  status: "NotSubmitted" | "Submitted" | "Returned";
  submittedAt: string | null;
  fileName: string | null;
  fileSize: number | null;
  submissionId?: string | null;
  type?: SubmissionMode | null;
  githubRepoUrl?: string | null;
  branch?: string | null;
  commitHash?: string | null;
}

interface SubmissionCardProps {
  courseAssignmentId: string;
  initial: SubmissionState;
}

const MAX_ZIP_SIZE_MB = 100;

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

export function SubmissionCard({ courseAssignmentId, initial }: SubmissionCardProps) {
  const [state, setState] = useState<SubmissionState>(initial);
  const [mode, setMode] = useState<SubmissionMode>("Upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showUploader, setShowUploader] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [hostedUrl, setHostedUrl] = useState("");
  const [note, setNote] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
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
    if (file.size > MAX_ZIP_SIZE_MB * 1024 * 1024) {
      const msg = `File is too large (${formatBytes(file.size)}). The maximum allowed size is ${MAX_ZIP_SIZE_MB} MB.`;
      setFileError(msg);
      setToast({ message: msg, variant: "error" });
      if (inputRef.current) inputRef.current.value = "";
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
        type: "Upload",
      });
      resetForm();
      setToast({ message: `${selectedFile.name} submitted successfully!`, variant: "success" });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "";
      const isSizeError =
        errMsg.includes("413") ||
        errMsg.toLowerCase().includes("too large") ||
        errMsg.toLowerCase().includes("request entity");
      const displayMsg = isSizeError
        ? `File is too large. The maximum allowed size is ${MAX_ZIP_SIZE_MB} MB. Please reduce your ZIP and try again.`
        : "Upload failed. Please try again.";
      setFileError(displayMsg);
      setToast({ message: displayMsg, variant: "error" });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function resetForm() {
    setShowUploader(false);
    setSelectedFile(null);
    setFileError(null);
    setProgress(0);
    setFigmaUrl("");
    setGithubRepoUrl("");
    setBranch("");
    setHostedUrl("");
    setNote("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleGithubSubmit() {
    const repo = githubRepoUrl.trim();
    if (!repo) {
      setFileError("Please enter your GitHub repository URL.");
      return;
    }
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+/i.test(repo)) {
      setFileError("Enter a valid public GitHub repo URL (https://github.com/owner/repo).");
      return;
    }

    setUploading(true);
    setFileError(null);
    try {
      const token = getToken();
      if (!token) throw new Error("Session expired — please log in again.");

      const result = await submissionsApi.githubSubmit(
        courseAssignmentId,
        {
          repoUrl: repo,
          branch: branch.trim() || undefined,
          figmaUrl: figmaUrl || undefined,
          hostedUrl: hostedUrl || undefined,
          note: note || undefined,
        },
        token
      );

      setState({
        status: "Submitted",
        submittedAt: new Date().toISOString(),
        fileName: null,
        fileSize: null,
        submissionId: result.id ?? null,
        type: "GitHub",
        githubRepoUrl: repo,
        branch: branch.trim() || null,
      });
      resetForm();
      setToast({ message: "GitHub repository submitted successfully!", variant: "success" });
    } catch (err) {
      const msg = err instanceof Error && err.message
        ? err.message
        : "Submission failed. Please check the repo URL and try again.";
      setFileError(msg);
      setToast({ message: msg, variant: "error" });
    } finally {
      setUploading(false);
    }
  }

  // Dispatch to the active submission mode (called directly, or after the
  // guidelines modal is accepted).
  function submitCurrent() {
    if (mode === "GitHub") {
      handleGithubSubmit();
    } else {
      handleUpload();
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
      await downloadFromUrl(artifact.downloadUrl, artifact.fileName);
    } catch (err) {
      setDownloadError("Failed to download: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setDownloading(false);
    }
  }

  function handleCancelUpload() {
    resetForm();
    setMode("Upload");
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-3.5 text-sm font-medium text-white shadow-xl animate-in slide-in-from-bottom-4 duration-300 max-w-sm ${
          toast.variant === "error"
            ? "border-red-400/40 bg-red-600 dark:bg-red-700"
            : "border-green-200 dark:border-green-900/50 bg-green-600 dark:bg-green-700"
        }`}>
          {toast.variant === "error"
            ? <AlertCircle className="h-4 w-4 shrink-0" />
            : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">My Submission</h2>

      {/* Submitted status */}
      {(state.status === "Submitted" || state.status === "Returned") && state.submittedAt && (
        <div className={`rounded-lg border px-4 py-3 space-y-1.5 ${
          state.status === "Returned"
            ? "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30"
            : "border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30"
        }`}>
          <div className={`flex items-center gap-2 text-sm font-medium ${
            state.status === "Returned" ? "text-red-800 dark:text-red-300" : "text-green-800 dark:text-green-300"
          }`}>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {state.status === "Returned" ? "Returned - Resubmit Required" : "Submitted"}
          </div>
          <p className={`text-xs ${
            state.status === "Returned" ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"
          }`}>
            {formatDateTime(state.submittedAt)}
            {state.type === "GitHub" ? (
              <>
                {state.branch && (
                  <> · branch <span className="font-medium">{state.branch}</span></>
                )}
              </>
            ) : (
              <>
                {state.fileName && (
                  <> · <span className="font-medium">{state.fileName}</span></>
                )}
                {state.fileSize != null && (
                  <> ({formatBytes(state.fileSize)})</>
                )}
              </>
            )}
          </p>

          {/* GitHub submission — link out to the repository */}
          {state.type === "GitHub" && state.githubRepoUrl && (
            <a
              href={state.githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-green-900 dark:text-green-400 underline underline-offset-2 hover:text-green-700 dark:hover:text-green-300"
            >
              <Github className="h-3 w-3" />
              View repository
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {/* Upload submission — download submitted ZIP (not when returned) */}
          {state.type !== "GitHub" && state.status !== "Returned" && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1 text-xs font-medium text-green-900 dark:text-green-400 underline underline-offset-2 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50"
            >
              <Download className="h-3 w-3" />
              {downloading ? "Downloading..." : "Download submitted ZIP"}
            </button>
          )}
          {downloadError && (
            <p className="text-xs text-red-600 dark:text-red-400">{downloadError}</p>
          )}
        </div>
      )}

      {/* Upload area */}
      {showUploader ? (
        <div className="space-y-3">
          {/* Submission type toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-700 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => { setMode("Upload"); setFileError(null); }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${
                mode === "Upload"
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
            >
              <Upload className="h-3.5 w-3.5" /> ZIP Upload
            </button>
            <button
              type="button"
              onClick={() => { setMode("GitHub"); setFileError(null); }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${
                mode === "GitHub"
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
            >
              <Github className="h-3.5 w-3.5" /> GitHub Repo
            </button>
          </div>

          {mode === "Upload" && (
            <label className="block">
              <span className="sr-only">Choose ZIP file</span>
              <input
                ref={inputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={handleFileChange}
                className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-gray-700 dark:text-slate-300
                  file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 dark:file:bg-slate-700 file:px-2.5
                  file:py-1.5 file:text-xs file:font-medium file:text-gray-600 dark:file:text-slate-300 hover:file:bg-gray-200 dark:hover:file:bg-slate-600"
              />
            </label>
          )}

          {mode === "GitHub" && (
            <div className="space-y-2">
              <div>
                <label htmlFor="GithubRepoRequired" className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                  GitHub Repository URL <span className="text-red-500">*</span>
                </label>
                <input
                  id="GithubRepoRequired"
                  type="url"
                  value={githubRepoUrl}
                  onChange={(e) => setGithubRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-brand-500 dark:focus:border-brand-400 focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
                />
                <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">
                  Repository must be public. We&apos;ll capture the latest commit when you submit.
                </p>
              </div>
              <div>
                <label htmlFor="GithubBranch" className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Branch (optional)
                </label>
                <input
                  id="GithubBranch"
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-brand-500 dark:focus:border-brand-400 focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
                />
              </div>
            </div>
          )}

          {/* External URL fields */}
          <div className="space-y-2">
            <div>
              <label htmlFor="FigmaUrl" className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                Figma URL (optional)
              </label>
              <input
                id="FigmaUrl"
                type="url"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                placeholder="https://figma.com/file/..."
                className="block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-brand-500 dark:focus:border-brand-400 focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
              />
            </div>
            {mode === "Upload" && (
              <div>
                <label htmlFor="GithubURL" className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                  GitHub Repo URL (optional)
                </label>
                <input
                  id="GithubURL"
                  type="url"
                  value={githubRepoUrl}
                  onChange={(e) => setGithubRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-brand-500 dark:focus:border-brand-400 focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
                />
              </div>
            )}
            <div>
              <label htmlFor="HostedURL" className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                Hosted URL (optional)
              </label>
              <input
              id="HostedURL"
                type="url"
                value={hostedUrl}
                onChange={(e) => setHostedUrl(e.target.value)}
                placeholder="https://your-app.vercel.app"
                className="block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-brand-500 dark:focus:border-brand-400 focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
              />
            </div>
            <div>
              <label htmlFor="CommentField" className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                Note / Comment (optional)
              </label>
              <textarea
              id="CommentField"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any notes or comments about your submission..."
                rows={3}
                className="block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-brand-500 dark:focus:border-brand-400 focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400 resize-none"
              />
            </div>
          </div>

          {selectedFile && !fileError && (
            <p className="text-xs text-gray-500 dark:text-slate-400">
              <span className="font-medium">{selectedFile.name}</span> · {formatBytes(selectedFile.size)}
            </p>
          )}

          {fileError && (
            <p className="text-xs text-red-600 dark:text-red-400">{fileError}</p>
          )}

          {uploading && mode === "Upload" && (
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Uploading… {progress}%</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!guidelinesAccepted) {
                  setShowGuidelines(true);
                } else {
                  submitCurrent();
                }
              }}
              disabled={uploading || (mode === "Upload" ? !selectedFile : !githubRepoUrl.trim())}
              className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {mode === "GitHub" ? <Github className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading
                ? (mode === "GitHub" ? "Submitting…" : "Uploading…")
                : (mode === "GitHub" ? "Submit Repo" : "Upload ZIP")}
            </button>
            <button
              onClick={handleCancelUpload}
              disabled={uploading}
              className="flex items-center gap-1 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // Show submit button if not submitted OR if returned (allow resubmission)
        (state.status === "NotSubmitted" || state.status === "Returned") && (
          <button
            onClick={() => setShowUploader(true)}
            className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium ${
              state.status === "Returned"
                ? "border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            }`}
          >
            <Upload className="h-3.5 w-3.5" /> {state.status === "Returned" ? "Resubmit Work" : "Submit Work"}
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
          submitCurrent();
        }}
      />
    </div>
  );
}
