export type SubmissionType = "Upload" | "GitHub";

export type SubmissionStatus =
  | "Draft"
  | "PendingUpload"
  | "Uploaded"
  | "Processing"
  | "ReadyToGrade"
  | "Grading"
  | "Graded"
  | "Returned";

export interface FileMeta {
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface FileUploadSlot {
  fileName: string;
  blobPath: string;
  sasUrl: string;
  contentType: string;
  maxSizeBytes: number;
}

export interface UploadUrlResponse {
  submissionId: string;
  uploadSlots: FileUploadSlot[];
  expiresAt: string;
}

export interface CompletedFile {
  blobPath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
}

export interface SubmissionResponse {
  id: string;
  courseAssignmentId: string;
  assignmentId?: string;
  studentId: string;
  attemptNumber: number;
  type: SubmissionType;
  status: SubmissionStatus;
  createdAt: string;
  figmaUrl?: string | null;
  githubRepoUrl?: string | null;
  hostedUrl?: string | null;
}

export interface ArtifactItem {
  artifactId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
  downloadUrl: string;
  urlExpiresAt: string;
}

export interface ArtifactListResponse {
  submissionId: string;
  urlsExpireAt: string;
  artifacts: ArtifactItem[];
}
