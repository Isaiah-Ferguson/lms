import type {
  FileMeta,
  UploadUrlResponse,
  CompletedFile,
  SubmissionResponse,
  ArtifactListResponse,
} from "@/types";
import { apiFetch } from "./core";

// ─── Submissions API ──────────────────────────────────────────────────────────

export const submissionsApi = {
  requestUpload(
    courseAssignmentId: string,
    files: FileMeta[],
    token: string,
    figmaUrl?: string | null,
    githubRepoUrl?: string | null,
    hostedUrl?: string | null,
    note?: string | null
  ): Promise<UploadUrlResponse> {
    return apiFetch<UploadUrlResponse>(
      `/api/submissions/${courseAssignmentId}/request-upload`,
      {
        method: "POST",
        body: JSON.stringify({
          type: "Upload",
          files,
          figmaUrl: figmaUrl || null,
          githubRepoUrl: githubRepoUrl || null,
          hostedUrl: hostedUrl || null,
          note: note || null
        }),
      },
      token
    );
  },

  completeUpload(
    submissionId: string,
    files: CompletedFile[],
    token: string
  ): Promise<SubmissionResponse> {
    return apiFetch<SubmissionResponse>(
      `/api/submissions/${submissionId}/complete-upload`,
      {
        method: "POST",
        body: JSON.stringify({ files }),
      },
      token
    );
  },

  getStatus(submissionId: string, token: string): Promise<SubmissionResponse> {
    return apiFetch<SubmissionResponse>(
      `/api/submissions/${submissionId}/status`,
      {},
      token
    );
  },

  getArtifacts(submissionId: string, token: string): Promise<ArtifactListResponse> {
    return apiFetch<ArtifactListResponse>(
      `/api/submissions/${submissionId}/artifacts`,
      {},
      token
    );
  },

  githubSubmit(
    courseAssignmentId: string,
    payload: {
      repoUrl: string;
      branch?: string;
      figmaUrl?: string;
      hostedUrl?: string;
      note?: string;
    },
    token: string
  ): Promise<SubmissionResponse> {
    return apiFetch<SubmissionResponse>(
      `/api/submissions/${courseAssignmentId}/github-submit`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token
    );
  },
};
