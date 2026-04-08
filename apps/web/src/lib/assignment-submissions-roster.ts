import {
  getCourseAssignmentInstance,
  getCurrentUser,
} from "@/lib/course-assignment-instances";

export type AssignmentRosterStatus =
  | "NotSubmitted"
  | "Submitted"
  | "NeedsGrading"
  | "Graded"
  | "Returned";

export interface AssignmentSubmissionsRosterData {
  assignment: {
    title: string;
  };
  rows: {
    user: {
      id: string;
      name: string;
      username: string;
      email: string;
    };
    status: AssignmentRosterStatus;
    submissionId?: string;
    submittedAt: string | null;
    grade: string | null;
    gradedAt: string | null;
    gradedBy: string | null;
  }[];
  permissions: {
    canViewSubmissions: boolean;
  };
}

export function getAssignmentSubmissionsRoster(
  courseId: string,
  courseAssignmentId: string
): AssignmentSubmissionsRosterData {
  const currentUser = getCurrentUser();
  const assignment = getCourseAssignmentInstance(courseId, courseAssignmentId);
  const canViewSubmissions = currentUser.role === "Admin" || currentUser.role === "Instructor";

  return {
    assignment: {
      title: assignment
        ? `${courseId.toUpperCase()} • ${assignment.title}`
        : `${courseId.toUpperCase()} • Assignment ${courseAssignmentId}`,
    },
    rows: [
      {
        user: { id: "u-1", name: "Ava Johnson", username: "avaj", email: "ava.johnson@codestack.dev" },
        status: "NeedsGrading",
        submissionId: "sub-1001",
        submittedAt: "2026-02-24T18:20:00.000Z",
        grade: null,
        gradedAt: null,
        gradedBy: null,
      },
      {
        user: { id: "u-2", name: "Liam Carter", username: "liamc", email: "liam.carter@codestack.dev" },
        status: "Graded",
        submissionId: "sub-1002",
        submittedAt: "2026-02-24T17:35:00.000Z",
        grade: "93%",
        gradedAt: "2026-02-25T15:10:00.000Z",
        gradedBy: "Chris M.",
      },
      {
        user: { id: "u-3", name: "Mia Sanchez", username: "mias", email: "mia.sanchez@codestack.dev" },
        status: "NotSubmitted",
        submittedAt: null,
        grade: null,
        gradedAt: null,
        gradedBy: null,
      },
      {
        user: { id: "u-4", name: "Noah Patel", username: "noahp", email: "noah.patel@codestack.dev" },
        status: "Submitted",
        submissionId: "sub-1004",
        submittedAt: "2026-02-25T01:05:00.000Z",
        grade: null,
        gradedAt: null,
        gradedBy: null,
      },
      {
        user: { id: "u-5", name: "Sophia Lee", username: "sophial", email: "sophia.lee@codestack.dev" },
        status: "NeedsGrading",
        submissionId: "sub-1005",
        submittedAt: "2026-02-25T02:40:00.000Z",
        grade: null,
        gradedAt: null,
        gradedBy: null,
      },
      {
        user: { id: "u-6", name: "Ethan Brooks", username: "ethanb", email: "ethan.brooks@codestack.dev" },
        status: "Graded",
        submissionId: "sub-1006",
        submittedAt: "2026-02-24T22:12:00.000Z",
        grade: "86 / 100",
        gradedAt: "2026-02-25T16:55:00.000Z",
        gradedBy: "Chris M.",
      },
      {
        user: { id: "u-7", name: "Isabella Kim", username: "isabellak", email: "isabella.kim@codestack.dev" },
        status: "NotSubmitted",
        submittedAt: null,
        grade: null,
        gradedAt: null,
        gradedBy: null,
      },
      {
        user: { id: "u-8", name: "Mason Rivera", username: "masonr", email: "mason.rivera@codestack.dev" },
        status: "Submitted",
        submissionId: "sub-1008",
        submittedAt: "2026-02-25T03:28:00.000Z",
        grade: null,
        gradedAt: null,
        gradedBy: null,
      },
      {
        user: { id: "u-9", name: "Charlotte Nguyen", username: "charlotten", email: "charlotte.nguyen@codestack.dev" },
        status: "Graded",
        submissionId: "sub-1009",
        submittedAt: "2026-02-24T20:05:00.000Z",
        grade: "100%",
        gradedAt: "2026-02-25T12:02:00.000Z",
        gradedBy: "Alex R.",
      },
      {
        user: { id: "u-10", name: "James Wilson", username: "jamesw", email: "james.wilson@codestack.dev" },
        status: "NeedsGrading",
        submissionId: "sub-1010",
        submittedAt: "2026-02-25T04:14:00.000Z",
        grade: null,
        gradedAt: null,
        gradedBy: null,
      },
      {
        user: { id: "u-11", name: "Amelia Davis", username: "ameliad", email: "amelia.davis@codestack.dev" },
        status: "NotSubmitted",
        submittedAt: null,
        grade: null,
        gradedAt: null,
        gradedBy: null,
      },
      {
        user: { id: "u-12", name: "Benjamin Clark", username: "benjaminc", email: "benjamin.clark@codestack.dev" },
        status: "Submitted",
        submissionId: "sub-1012",
        submittedAt: "2026-02-25T06:30:00.000Z",
        grade: null,
        gradedAt: null,
        gradedBy: null,
      },
    ],
    permissions: {
      canViewSubmissions,
    },
  };
}
