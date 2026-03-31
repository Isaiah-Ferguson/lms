import {
  canStudentAccessAssignment,
  getCourseAssignmentInstance,
  getCurrentUser,
  getTimeRemainingLabel,
} from "@/lib/course-assignment-instances";

export interface AssignmentPageData {
  access: {
    canView: boolean;
    blockedReason?: "NotEnrolled" | "NotReleased" | "HiddenFromStudents" | "NotFound";
  };
  currentUser: {
    role: "Student" | "Instructor" | "Admin";
  };
  assignment: {
    courseAssignmentId: string;
    templateKey: string;
    title: string;
    instructionsHtml: string;
    releaseAt: string;
    dueDate: string;
    isHiddenFromStudents: boolean;
    timeRemaining: string;
  };
  gradingSummary: {
    participants: number;
    submitted: number;
    needsGrading: number;
  };
  mySubmission: {
    status: "Not submitted" | "Submitted" | "Graded";
    submittedAt: string | null;
    grade?: string;
  };
  permissions: {
    canSubmit: boolean;
    canEditAssignment: boolean;
    canViewSubmissions: boolean;
  };
}

export function getAssignmentPageData(courseId: string, courseAssignmentId: string): AssignmentPageData {
  const currentUser = getCurrentUser();
  const assignmentInstance = getCourseAssignmentInstance(courseId, courseAssignmentId);

  if (!assignmentInstance) {
    return {
      access: {
        canView: false,
        blockedReason: "NotFound",
      },
      currentUser: {
        role: currentUser.role,
      },
      assignment: {
        courseAssignmentId,
        templateKey: "unknown",
        title: "Assignment",
        instructionsHtml: "",
        releaseAt: new Date(0).toISOString(),
        dueDate: new Date(0).toISOString(),
        isHiddenFromStudents: false,
        timeRemaining: "Past due",
      },
      gradingSummary: {
        participants: 0,
        submitted: 0,
        needsGrading: 0,
      },
      mySubmission: {
        status: "Not submitted",
        submittedAt: null,
      },
      permissions: {
        canSubmit: false,
        canEditAssignment: false,
        canViewSubmissions: false,
      },
    };
  }

  const isAdminOrInstructor = currentUser.role === "Admin" || currentUser.role === "Instructor";

  const isEnrolled = currentUser.enrolledCourseIds.includes(courseId);
  const isReleased = new Date(assignmentInstance.releaseAt).getTime() <= Date.now();

  const canView = isAdminOrInstructor || canStudentAccessAssignment(currentUser, assignmentInstance);
  const blockedReason = !canView
    ? !isEnrolled
      ? "NotEnrolled"
      : !isReleased
        ? "NotReleased"
        : "HiddenFromStudents"
    : undefined;

  const hasSubmitted = assignmentInstance.templateKey.includes("mc") || assignmentInstance.templateKey.includes("ch");
  const isGraded = assignmentInstance.templateKey.includes("ch");

  return {
    access: {
      canView,
      blockedReason,
    },
    currentUser: {
      role: currentUser.role,
    },
    assignment: {
      courseAssignmentId: assignmentInstance.courseAssignmentId,
      templateKey: assignmentInstance.templateKey,
      title: `${courseId.toUpperCase()} • ${assignmentInstance.title}`,
      instructionsHtml: `
        <p>Complete the assignment requirements and submit a single <strong>.zip</strong> file containing your project.</p>
        <ul>
          <li>Include source code and README instructions.</li>
          <li>Do not include build folders or dependencies.</li>
          <li>Ensure your ZIP filename includes your name and template key.</li>
        </ul>
      `,
      releaseAt: assignmentInstance.releaseAt,
      dueDate: assignmentInstance.dueDate,
      isHiddenFromStudents: assignmentInstance.isHiddenFromStudents,
      timeRemaining: getTimeRemainingLabel(assignmentInstance.dueDate),
    },
    gradingSummary: {
      participants: 24,
      submitted: 17,
      needsGrading: 6,
    },
    mySubmission: {
      status: isGraded ? "Graded" : hasSubmitted ? "Submitted" : "Not submitted",
      submittedAt: hasSubmitted || isGraded ? new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() : null,
      grade: isGraded ? "92 / 100" : undefined,
    },
    permissions: {
      canSubmit: currentUser.role === "Student" && canView,
      canEditAssignment: isAdminOrInstructor,
      canViewSubmissions: isAdminOrInstructor,
    },
  };
}
