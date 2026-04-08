import type { SubmissionType, SubmissionStatus } from "./submission";

export interface StudentInfo {
  id: string;
  name: string;
  email: string;
}

export interface AssignmentInfo {
  id: string;
  title: string;
  instructions: string;
  maxScore: number;
}

export interface ArtifactInfo {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  readUrl: string;
}

export interface GitHubInfo {
  repoUrl: string;
  branch: string;
  commitHash: string | null;
}

export interface ExistingGrade {
  gradeId: string;
  totalScore: number;
  rubricBreakdownJson: string;
  overallComment: string;
  gradedAt: string;
  instructorId: string;
}

export interface SubmissionDetail {
  submissionId: string;
  attemptNumber: number;
  type: SubmissionType;
  status: SubmissionStatus;
  createdAt: string;
  figmaUrl?: string | null;
  githubRepoUrl?: string | null;
  hostedUrl?: string | null;
  note?: string | null;
  student: StudentInfo;
  assignment: AssignmentInfo;
  artifacts: ArtifactInfo[] | null;
  gitHubInfo: GitHubInfo | null;
  existingGrade: ExistingGrade | null;
}

export interface GradeSubmissionRequest {
  TotalScore: number;
  RubricBreakdownJson: string;
  OverallComment: string;
}

export interface SubmissionQueuePage {
  items: SubmissionQueueItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface SubmissionQueueItem {
  submissionId: string;
  studentName: string;
  studentEmail: string;
  assignmentTitle: string;
  courseTitle: string;
  type: SubmissionType;
  status: SubmissionStatus;
  submittedAt: string;
  gradedAt: string | null;
  totalScore: number | null;
  maxScore: number;
}

export interface StudentGradeRow {
  submissionId: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: string;
  maxScore: number;
  totalScore: number | null;
  status: "Graded" | "Pending" | "Missing";
  gradedAt: string | null;
  overallComment: string | null;
  gradedBy: string | null;
}

export interface StudentGrades {
  courseId: string;
  courseName: string;
  rows: StudentGradeRow[];
}

export interface AdminStudentGrade {
  userId: string;
  name: string;
  email: string;
  rows: StudentGradeRow[];
}

export interface AdminGrades {
  courseId: string;
  courseName: string;
  students: AdminStudentGrade[];
}

export interface AssignmentSubmissionsRosterRow {
  userId: string;
  userName: string;
  userEmail: string;
  status: string;
  submissionId: string | null;
  submittedAt: string | null;
  grade: string | null;
  gradedAt: string | null;
  gradedBy: string | null;
}

export interface AssignmentSubmissionsRosterResponse {
  assignmentId: string;
  assignmentTitle: string;
  dueDate: string | null;
  rows: AssignmentSubmissionsRosterRow[];
}
