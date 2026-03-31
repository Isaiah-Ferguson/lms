import { getCurrentUser } from "@/lib/course-assignment-instances";

export interface SubmissionDetailData {
  submission: {
    id: string;
    student: {
      name: string;
      username: string;
    };
    assignmentTitle: string;
    submittedAt: string;
    zipDownloadUrl: string;
    status: "Submitted" | "NeedsGrading" | "Graded";
  };
  grade: {
    score: number | null;
    maxScore: number;
    comment: string;
    gradedAt: string | null;
    gradedBy: string | null;
  };
  permissions: {
    canGrade: boolean;
  };
}

export function getSubmissionDetail(submissionId: string): SubmissionDetailData {
  const currentUser = getCurrentUser();
  const graded = submissionId.toLowerCase().includes("graded") || submissionId.endsWith("2");

  return {
    submission: {
      id: submissionId,
      student: {
        name: "Ava Johnson",
        username: "avaj",
      },
      assignmentTitle: "Level 2 • API Integration Challenge",
      submittedAt: "2026-02-25T02:40:00.000Z",
      zipDownloadUrl: "https://example.com/downloads/submission.zip",
      status: graded ? "Graded" : "NeedsGrading",
    },
    grade: {
      score: graded ? 92 : null,
      maxScore: 100,
      comment: graded ? "Great implementation and clean structure. Improve edge-case handling." : "",
      gradedAt: graded ? "2026-02-25T12:20:00.000Z" : null,
      gradedBy: graded ? "Chris M." : null,
    },
    permissions: {
      canGrade: currentUser.role === "Admin" || currentUser.role === "Instructor",
    },
  };
}
