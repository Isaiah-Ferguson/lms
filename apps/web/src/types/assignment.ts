export interface CreateAssignmentRequest {
  title: string;
  assignmentType: string;
  instructions: string;
  dueDate: string;
  rubricJson: string;
  moduleId: string;
}

export interface UpdateAssignmentRequest {
  title: string;
  assignmentType: string;
  instructions: string;
  dueDate: string;
  rubricJson: string;
}

export interface Assignment {
  id: string;
  title: string;
  assignmentType: string;
  instructions: string;
  dueDate: string;
  rubricJson: string;
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AssignmentListItem {
  id: string;
  title: string;
  assignmentType: string;
  dueDate: string;
  moduleTitle: string;
  courseTitle: string;
  submissionCount: number;
  createdAt: string;
}

export interface StudentSubmissionStatus {
  hasSubmitted: boolean;
  submissionId: string | null;
  submittedAt: string | null;
  fileName: string | null;
  fileSize: number | null;
  status: string | null;
}
