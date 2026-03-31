"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { Upload, Github, ArrowLeft, CheckCircle2 } from "lucide-react";

import { githubSubmitSchema, type GitHubSubmitFormData } from "@/lib/schemas";
import { submissionsApi, uploadFileToBlobSas, ApiError } from "@/lib/api-client";
import type { CompletedFile, SubmissionResponse } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { FileDropZone, type SelectedFile } from "@/components/submissions/FileDropZone";
import { SubmissionResultCard } from "@/components/submissions/SubmissionStatus";
import { SubmissionGuidelinesModal } from "@/components/submissions/SubmissionGuidelinesModal";

type SubmissionMode = "upload" | "github";

interface FileUploadProgress {
  fileName: string;
  percent: number;
  done: boolean;
  error?: string;
}

export default function SubmitAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const courseAssignmentId = params.courseAssignmentId as string;

  const [mode, setMode] = useState<SubmissionMode>("upload");
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResponse | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset: resetGitHub,
  } = useForm<GitHubSubmitFormData>({
    resolver: zodResolver(githubSubmitSchema),
    defaultValues: { branch: "main" },
  });

  function resetAll() {
    setFiles([]);
    setUploadProgress([]);
    setError(null);
    setResult(null);
    resetGitHub();
  }

  async function handleFileSubmit() {
    if (files.length === 0) {
      setError("Please add at least one file.");
      return;
    }

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setError(null);
    setSubmitting(true);
    setUploadProgress(
      files.map((f) => ({ fileName: f.file.name, percent: 0, done: false }))
    );

    try {
      const uploadResponse = await submissionsApi.requestUpload(
        courseAssignmentId,
        files.map((f) => ({
          fileName: f.file.name,
          contentType: f.file.type || "application/octet-stream",
          sizeBytes: f.file.size,
        })),
        token
      );

      const completedFiles: CompletedFile[] = [];

      await Promise.all(
        uploadResponse.uploadSlots.map(async (slot, idx) => {
          const selectedFile = files.find((f) => f.file.name === slot.fileName);
          if (!selectedFile) return;

          try {
            await uploadFileToBlobSas(
              slot.sasUrl,
              selectedFile.file,
              slot.contentType,
              (percent) => {
                setUploadProgress((prev) =>
                  prev.map((p, i) => (i === idx ? { ...p, percent } : p))
                );
              }
            );

            setUploadProgress((prev) =>
              prev.map((p, i) => (i === idx ? { ...p, percent: 100, done: true } : p))
            );

            completedFiles.push({
              blobPath: slot.blobPath,
              fileName: slot.fileName,
              contentType: slot.contentType,
              sizeBytes: selectedFile.file.size,
              checksum: "",
            });
          } catch (uploadErr) {
            const msg =
              uploadErr instanceof Error ? uploadErr.message : "Upload failed";
            setUploadProgress((prev) =>
              prev.map((p, i) =>
                i === idx ? { ...p, error: msg, done: false } : p
              )
            );
            throw uploadErr;
          }
        })
      );

      const submission = await submissionsApi.completeUpload(
        uploadResponse.submissionId,
        completedFiles,
        token
      );

      setResult(submission);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.errors?.join(" ") ?? err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGitHubSubmit(data: GitHubSubmitFormData) {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const submission = await submissionsApi.githubSubmit(
        courseAssignmentId,
        data,
        token
      );
      setResult(submission);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.errors?.join(" ") ?? err.detail);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="mb-6 flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">Submission complete</span>
        </div>
        <SubmissionResultCard
          submission={result}
          onSubmitAnother={resetAll}
        />
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignment
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <Card>
        <CardHeader>
          <CardTitle>Submit Assignment</CardTitle>
          <CardDescription>
            Choose how you want to submit your work
          </CardDescription>
        </CardHeader>

        <div className="mb-6 flex rounded-lg border border-gray-200 p-1">
          <button
            type="button"
            onClick={() => { setMode("upload"); setError(null); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "upload"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload Files
          </button>
          <button
            type="button"
            onClick={() => { setMode("github"); setError(null); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "github"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Github className="h-4 w-4" />
            GitHub Repo
          </button>
        </div>

        {error && (
          <Alert variant="error" message={error} className="mb-5" />
        )}

        {mode === "upload" && (
          <div className="space-y-5">
            <FileDropZone
              files={files}
              onChange={setFiles}
              disabled={submitting}
            />

            {uploadProgress.length > 0 && (
              <div className="space-y-3">
                {uploadProgress.map((p) => (
                  <div key={p.fileName}>
                    <ProgressBar
                      value={p.percent}
                      label={p.fileName}
                      showPercent
                    />
                    {p.error && (
                      <p className="mt-1 text-xs text-red-600">{p.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              className="w-full"
              size="lg"
              loading={submitting}
              disabled={files.length === 0}
              onClick={() => {
                if (!guidelinesAccepted) {
                  setShowGuidelines(true);
                } else {
                  handleFileSubmit();
                }
              }}
            >
              {submitting ? "Uploading…" : "Submit files"}
            </Button>
          </div>
        )}

        {mode === "github" && (
          <form
            onSubmit={handleSubmit(handleGitHubSubmit)}
            className="space-y-4"
            noValidate
          >
            <Input
              label="Repository URL"
              type="url"
              placeholder="https://github.com/username/repo"
              error={errors.repoUrl?.message}
              {...register("repoUrl")}
            />

            <Input
              label="Branch"
              type="text"
              placeholder="main"
              error={errors.branch?.message}
              {...register("branch")}
            />

            <Input
              label="Commit hash"
              type="text"
              placeholder="abc1234"
              hint="7–40 character hex commit SHA"
              error={errors.commitHash?.message}
              {...register("commitHash")}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={submitting}
            >
              {submitting ? "Submitting…" : "Submit repo"}
            </Button>
          </form>
        )}
      </Card>

      {/* Submission Guidelines Modal */}
      <SubmissionGuidelinesModal
        isOpen={showGuidelines}
        onClose={() => setShowGuidelines(false)}
        onAccept={() => {
          setGuidelinesAccepted(true);
          setShowGuidelines(false);
          handleFileSubmit();
        }}
      />
    </div>
  );
}
