export type UserRole = "Student" | "Instructor" | "Admin";
export type AssignmentType = "MiniChallenge" | "Challenge" | "Project";

export interface CourseAssignmentInstance {
  courseId: string;
  courseAssignmentId: string;
  templateKey: string;
  title: string;
  type: AssignmentType;
  weekNumber?: number;
  releaseAt: string;
  dueDate: string;
  isHiddenFromStudents: boolean;
}

export interface StubCurrentUser {
  id: string;
  role: UserRole;
  enrolledCourseIds: string[];
}

function isoDaysFromNow(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(23, 59, 0, 0);
  return date.toISOString();
}

function buildAssignment(
  courseId: string,
  courseAssignmentId: string,
  templateKey: string,
  title: string,
  type: AssignmentType,
  options: {
    weekNumber?: number;
    releaseInDays: number;
    dueInDays: number;
    isHiddenFromStudents?: boolean;
  }
): CourseAssignmentInstance {
  assertCourseAssignmentId(courseAssignmentId);

  return {
    courseId,
    courseAssignmentId,
    templateKey,
    title,
    type,
    weekNumber: options.weekNumber,
    releaseAt: isoDaysFromNow(options.releaseInDays),
    dueDate: isoDaysFromNow(options.dueInDays),
    isHiddenFromStudents: options.isHiddenFromStudents ?? false,
  };
}

// Minimal runtime assertion to keep IDs in the non-guessable instance-id format.
function assertCourseAssignmentId(courseAssignmentId: string): void {
  const isValid = /^ca_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}$/.test(courseAssignmentId);
  if (!isValid) {
    throw new Error(`Invalid courseAssignmentId format: ${courseAssignmentId}`);
  }
}

const COURSE_ASSIGNMENTS: Record<string, CourseAssignmentInstance[]> = {
  combine: [
    buildAssignment("combine", "ca_4f29e83a-8c12-41a0", "mc-w1-1", "Say Hello", "MiniChallenge", {
      weekNumber: 1,
      releaseInDays: -40,
      dueInDays: 7,
    }),
    buildAssignment("combine", "ca_9ed9be61-53d9-43a2", "ch-w3-1", "Unity Essentials — Digital Clock + Student Directory (mini-capstone)", "Challenge", {
      weekNumber: 3,
      releaseInDays: -12,
      dueInDays: 10,
    }),
  ],
  "level-1": [
    buildAssignment("level-1", "ca_8d2ab411-13f5-4ed9", "mc-1", "Semantic HTML page", "MiniChallenge", {
      weekNumber: 2,
      releaseInDays: -10,
      dueInDays: 5,
    }),
    buildAssignment("level-1", "ca_0cf24b20-31bc-4f90", "mc-2", "Style a blog post", "MiniChallenge", {
      weekNumber: 3,
      releaseInDays: -6,
      dueInDays: 6,
    }),
    buildAssignment("level-1", "ca_4e8f73dd-68a2-4d44", "mc-3", "Flexbox nav bar", "MiniChallenge", {
      weekNumber: 4,
      releaseInDays: -4,
      dueInDays: 8,
    }),
    buildAssignment("level-1", "ca_a0f5482a-3a42-4de7", "mc-4", "Bootstrap card grid", "MiniChallenge", {
      weekNumber: 5,
      releaseInDays: -2,
      dueInDays: 9,
    }),
    buildAssignment("level-1", "ca_91de224f-f009-4775", "ch-1", "Responsive landing page", "Challenge", {
      weekNumber: 4,
      releaseInDays: -4,
      dueInDays: 8,
    }),
    buildAssignment("level-1", "ca_5bc8d5e9-45d6-4cc5", "pr-1", "Personal portfolio website", "Project", {
      releaseInDays: 2,
      dueInDays: 14,
      isHiddenFromStudents: true,
    }),
  ],
  "level-2": [
    buildAssignment("level-2", "ca_2b41ad11-5d9a-414f", "mc-w1-1", "Say Hello (endpoint)", "MiniChallenge", {
      weekNumber: 1,
      releaseInDays: -9,
      dueInDays: 4,
    }),
    buildAssignment("level-2", "ca_45f6ac9e-bef9-4f88", "ch-w2-1", "SQL Murder Mystery", "Challenge", {
      weekNumber: 2,
      releaseInDays: -8,
      dueInDays: 5,
    }),
  ],
  "level-3": [
    buildAssignment("level-3", "ca_3d9ca2a6-f2e1-4221", "mc-w1-1", "TypeScript conversion mini-project", "MiniChallenge", {
      weekNumber: 1,
      releaseInDays: -15,
      dueInDays: 3,
    }),
  ],
  "level-4": [
    buildAssignment("level-4", "ca_127f77ce-1167-43da", "mc-w1-1", "Onion Architecture refactor exercise (starter API)", "MiniChallenge", {
      weekNumber: 1,
      releaseInDays: -20,
      dueInDays: 2,
    }),
  ],
};

export function getCourseAssignments(courseId: string): CourseAssignmentInstance[] {
  return COURSE_ASSIGNMENTS[courseId] ?? [];
}

export function getCourseAssignmentInstance(
  courseId: string,
  courseAssignmentId: string
): CourseAssignmentInstance | null {
  const assignment = getCourseAssignments(courseId).find(
    (item) => item.courseAssignmentId === courseAssignmentId
  );
  return assignment ?? null;
}

export function findCourseAssignmentId(
  courseId: string,
  templateKey: string
): string | null {
  const assignment = getCourseAssignments(courseId).find(
    (item) => item.templateKey === templateKey
  );
  return assignment?.courseAssignmentId ?? null;
}

export function getCurrentUser(): StubCurrentUser {
  const fromEnv = process.env.NEXT_PUBLIC_STUB_USER_ROLE;
  const role: UserRole =
    fromEnv === "Admin" || fromEnv === "Instructor" || fromEnv === "Student"
      ? fromEnv
      : "Student";

  return {
    id: "user-current",
    role,
    enrolledCourseIds: ["level-1", "level-2"],
  };
}

export function canStudentAccessAssignment(
  user: StubCurrentUser,
  assignment: CourseAssignmentInstance
): boolean {
  if (user.role !== "Student") {
    return true;
  }

  const isEnrolled = user.enrolledCourseIds.includes(assignment.courseId);
  const isReleased = new Date(assignment.releaseAt).getTime() <= Date.now();
  const isVisible = !assignment.isHiddenFromStudents;

  return isEnrolled && isReleased && isVisible;
}

export function getTimeRemainingLabel(dueDateIso: string): string {
  const due = new Date(dueDateIso).getTime();
  const diff = due - Date.now();

  if (diff <= 0) return "Past due";

  const minutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${Math.max(mins, 0)}m remaining`;
}
