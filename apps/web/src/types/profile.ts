export interface ProfileUserResponse {
  id: string;
  name: string;
  email: string;
  town: string;
  phoneNumber: string;
  gitHubUsername: string;
  avatarUrl: string | null;
  isOnProbation: boolean;
  probationReason: string;
  hasGraduated: boolean;
  graduatedAt: string | null;
  certificateUrl: string | null;
  certificateFileName: string | null;
}

export interface Enrollment {
  courseId: string;
  title: string;
  status: string;
}

export interface ProfileData {
  user: ProfileUserResponse;
  enrollments: Enrollment[];
}

export interface AvatarUploadSlotResponse {
  blobPath: string;
  sasUrl: string;
  readUrl: string;
  expiresAt: string;
}

export interface CertificateUploadSlotResponse {
  blobPath: string;
  sasUrl: string;
  readUrl: string;
  expiresAt: string;
}

export interface PreviousNoteExportItem {
  text: string;
  updatedAt: string;
  updatedBy: string;
}
