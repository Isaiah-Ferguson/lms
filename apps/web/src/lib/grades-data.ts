export type AssignmentType = "Mini" | "Challenge" | "Project" | "Quiz";
export type GradeStatus = "Graded" | "Pending" | "Missing";

export interface GradeRow {
  id: string;
  assignment: string;
  type: AssignmentType;
  score: number | null;
  maxScore: number;
  percent: number | null;
  status: GradeStatus;
  gradedAt: string | null;
  link: string | null;
}

export interface StudentGrades {
  courseId: string;
  courseName: string;
  overallPercent: number;
  gradedCount: number;
  totalCount: number;
  lastGradedAt: string;
  rows: GradeRow[];
  percentOverTime: { label: string; percent: number }[];
  avgByType: { type: string; avg: number }[];
}

export interface AdminStudent {
  id: string;
  name: string;
  username: string;
  email: string;
  overallPercent: number;
  gradedCount: number;
  totalCount: number;
  avgMini: number;
  avgChallenge: number;
  avgProject: number;
  lastSubmission: string;
  lastGraded: string;
  rows: GradeRow[];
}

export interface AdminGrades {
  courseId: string;
  courseName: string;
  canViewAllGrades: boolean;
  students: AdminStudent[];
  distribution: { bucket: string; count: number }[];
}

// ─── Course metadata ─────────────────────────────────────────────────────────

const COURSES: { id: string; name: string }[] = [
  { id: "combine",  name: "Combine"  },
  { id: "level-1",  name: "Level 1"  },
  { id: "level-2",  name: "Level 2"  },
  { id: "level-3",  name: "Level 3"  },
  { id: "level-4",  name: "Level 4"  },
];

export function getCourseList() {
  return COURSES;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(score: number | null, max: number): number | null {
  if (score === null) return null;
  return Math.round((score / max) * 100);
}

function avgOf(rows: GradeRow[], type: AssignmentType): number {
  const graded = rows.filter((r) => r.type === type && r.percent !== null);
  if (!graded.length) return 0;
  return Math.round(graded.reduce((s, r) => s + (r.percent ?? 0), 0) / graded.length);
}

// ─── Student grades stub ──────────────────────────────────────────────────────

const ASSIGNMENT_SETS: Record<string, Omit<GradeRow, "id">[]> = {
  "combine": [
    { assignment: "HTML Basics",             type: "Mini",      score: 90,  maxScore: 100, percent: 90,  status: "Graded",  gradedAt: "2024-09-05", link: "/assignments/cb-1" },
    { assignment: "CSS Fundamentals",        type: "Mini",      score: 85,  maxScore: 100, percent: 85,  status: "Graded",  gradedAt: "2024-09-12", link: "/assignments/cb-2" },
    { assignment: "Flexbox Layout",          type: "Challenge", score: 78,  maxScore: 100, percent: 78,  status: "Graded",  gradedAt: "2024-09-19", link: "/assignments/cb-3" },
    { assignment: "Intro JS Project",        type: "Project",   score: 88,  maxScore: 100, percent: 88,  status: "Graded",  gradedAt: "2024-09-26", link: "/assignments/cb-4" },
    { assignment: "DOM Manipulation",        type: "Mini",      score: null, maxScore: 100, percent: null, status: "Pending", gradedAt: null,         link: null               },
  ],
  "level-1": [
    { assignment: "Variables & Types",       type: "Quiz",      score: 95,  maxScore: 100, percent: 95,  status: "Graded",  gradedAt: "2024-10-03", link: "/assignments/l1-1" },
    { assignment: "Functions Deep Dive",     type: "Mini",      score: 88,  maxScore: 100, percent: 88,  status: "Graded",  gradedAt: "2024-10-10", link: "/assignments/l1-2" },
    { assignment: "Array Methods",           type: "Mini",      score: 82,  maxScore: 100, percent: 82,  status: "Graded",  gradedAt: "2024-10-17", link: "/assignments/l1-3" },
    { assignment: "OOP Challenge",           type: "Challenge", score: 76,  maxScore: 100, percent: 76,  status: "Graded",  gradedAt: "2024-10-24", link: "/assignments/l1-4" },
    { assignment: "Portfolio Project",       type: "Project",   score: 91,  maxScore: 100, percent: 91,  status: "Graded",  gradedAt: "2024-10-31", link: "/assignments/l1-5" },
    { assignment: "Async JS Mini",           type: "Mini",      score: null, maxScore: 100, percent: null, status: "Missing", gradedAt: null,         link: null               },
  ],
  "level-2": [
    { assignment: "Node Intro",              type: "Mini",      score: 87,  maxScore: 100, percent: 87,  status: "Graded",  gradedAt: "2024-11-07", link: "/assignments/l2-1" },
    { assignment: "Express Routes",          type: "Mini",      score: 90,  maxScore: 100, percent: 90,  status: "Graded",  gradedAt: "2024-11-14", link: "/assignments/l2-2" },
    { assignment: "REST API Challenge",      type: "Challenge", score: 83,  maxScore: 100, percent: 83,  status: "Graded",  gradedAt: "2024-11-21", link: "/assignments/l2-3" },
    { assignment: "Auth & Sessions",         type: "Mini",      score: 79,  maxScore: 100, percent: 79,  status: "Graded",  gradedAt: "2024-11-28", link: "/assignments/l2-4" },
    { assignment: "Full-Stack App",          type: "Project",   score: null, maxScore: 100, percent: null, status: "Pending", gradedAt: null,         link: null               },
  ],
  "level-3": [
    { assignment: "React Basics",            type: "Mini",      score: 92,  maxScore: 100, percent: 92,  status: "Graded",  gradedAt: "2025-01-09", link: "/assignments/l3-1" },
    { assignment: "Hooks & State",           type: "Mini",      score: 89,  maxScore: 100, percent: 89,  status: "Graded",  gradedAt: "2025-01-16", link: "/assignments/l3-2" },
    { assignment: "Context API Challenge",   type: "Challenge", score: 85,  maxScore: 100, percent: 85,  status: "Graded",  gradedAt: "2025-01-23", link: "/assignments/l3-3" },
    { assignment: "React Router Project",    type: "Project",   score: 94,  maxScore: 100, percent: 94,  status: "Graded",  gradedAt: "2025-01-30", link: "/assignments/l3-4" },
    { assignment: "Testing with Jest",       type: "Mini",      score: null, maxScore: 100, percent: null, status: "Pending", gradedAt: null,         link: null               },
  ],
  "level-4": [
    { assignment: "TypeScript Intro",        type: "Mini",      score: 88,  maxScore: 100, percent: 88,  status: "Graded",  gradedAt: "2025-03-06", link: "/assignments/l4-1" },
    { assignment: "Next.js Pages",           type: "Mini",      score: 91,  maxScore: 100, percent: 91,  status: "Graded",  gradedAt: "2025-03-13", link: "/assignments/l4-2" },
    { assignment: "Capstone Challenge",      type: "Challenge", score: 86,  maxScore: 100, percent: 86,  status: "Graded",  gradedAt: "2025-03-20", link: "/assignments/l4-3" },
    { assignment: "Capstone Project",        type: "Project",   score: null, maxScore: 100, percent: null, status: "Pending", gradedAt: null,         link: null               },
  ],
};

export function getStudentGrades(courseId: string): StudentGrades {
  const course = COURSES.find((c) => c.id === courseId) ?? COURSES[1];
  const rawRows = ASSIGNMENT_SETS[courseId] ?? ASSIGNMENT_SETS["level-1"];
  const rows: GradeRow[] = rawRows.map((r, i) => ({ ...r, id: `${courseId}-${i}` }));

  const graded = rows.filter((r) => r.percent !== null);
  const overallPercent = graded.length
    ? Math.round(graded.reduce((s, r) => s + (r.percent ?? 0), 0) / graded.length)
    : 0;

  const lastGradedRow = [...rows].reverse().find((r) => r.gradedAt);

  const percentOverTime = graded.map((r) => ({
    label: r.assignment.length > 14 ? r.assignment.slice(0, 14) + "…" : r.assignment,
    percent: r.percent ?? 0,
  }));

  const types: AssignmentType[] = ["Mini", "Challenge", "Project", "Quiz"];
  const avgByType = types
    .map((t) => ({ type: t, avg: avgOf(rows, t) }))
    .filter((x) => x.avg > 0);

  return {
    courseId: course.id,
    courseName: course.name,
    overallPercent,
    gradedCount: graded.length,
    totalCount: rows.length,
    lastGradedAt: lastGradedRow?.gradedAt ?? "—",
    rows,
    percentOverTime,
    avgByType,
  };
}

// ─── Admin grades stub ────────────────────────────────────────────────────────

const STUDENT_NAMES = [
  ["Alex",     "Thompson",  "athompson",  "alex.thompson@email.com"],
  ["Jordan",   "Rivera",    "jrivera",    "jordan.rivera@email.com"],
  ["Morgan",   "Chen",      "mchen",      "morgan.chen@email.com"],
  ["Taylor",   "Williams",  "twilliams",  "taylor.williams@email.com"],
  ["Casey",    "Martinez",  "cmartinez",  "casey.martinez@email.com"],
  ["Riley",    "Johnson",   "rjohnson",   "riley.johnson@email.com"],
  ["Drew",     "Patel",     "dpatel",     "drew.patel@email.com"],
  ["Avery",    "Kim",       "akim",       "avery.kim@email.com"],
  ["Quinn",    "Brown",     "qbrown",     "quinn.brown@email.com"],
  ["Sage",     "Garcia",    "sgarcia",    "sage.garcia@email.com"],
  ["Blake",    "Wilson",    "bwilson",    "blake.wilson@email.com"],
  ["Jamie",    "Lopez",     "jlopez",     "jamie.lopez@email.com"],
];

function makeStudentRows(courseId: string, seed: number): GradeRow[] {
  const base = ASSIGNMENT_SETS[courseId] ?? ASSIGNMENT_SETS["level-1"];
  return base.map((r, i) => {
    const offset = ((seed * 7 + i * 13) % 21) - 10;
    const score =
      r.score !== null ? Math.max(50, Math.min(100, r.score + offset)) : null;
    return {
      ...r,
      id: `${courseId}-s${seed}-${i}`,
      score,
      percent: pct(score, r.maxScore),
      status: score !== null ? "Graded" : r.status,
    };
  });
}

export function getAdminGrades(courseId: string): AdminGrades {
  const course = COURSES.find((c) => c.id === courseId) ?? COURSES[1];

  const students: AdminStudent[] = STUDENT_NAMES.map(([first, last, username, email], idx) => {
    const rows = makeStudentRows(courseId, idx);
    const graded = rows.filter((r) => r.percent !== null);
    const overallPercent = graded.length
      ? Math.round(graded.reduce((s, r) => s + (r.percent ?? 0), 0) / graded.length)
      : 0;
    const lastGradedRow = [...rows].reverse().find((r) => r.gradedAt);
    const lastSubRow = [...rows].reverse().find((r) => r.status !== "Missing");
    return {
      id: `student-${idx}`,
      name: `${first} ${last}`,
      username,
      email,
      overallPercent,
      gradedCount: graded.length,
      totalCount: rows.length,
      avgMini: avgOf(rows, "Mini"),
      avgChallenge: avgOf(rows, "Challenge"),
      avgProject: avgOf(rows, "Project"),
      lastSubmission: lastSubRow?.gradedAt ?? "—",
      lastGraded: lastGradedRow?.gradedAt ?? "—",
      rows,
    };
  });

  const distribution = [
    { bucket: "90–100", count: students.filter((s) => s.overallPercent >= 90).length },
    { bucket: "80–89",  count: students.filter((s) => s.overallPercent >= 80 && s.overallPercent < 90).length },
    { bucket: "70–79",  count: students.filter((s) => s.overallPercent >= 70 && s.overallPercent < 80).length },
    { bucket: "60–69",  count: students.filter((s) => s.overallPercent >= 60 && s.overallPercent < 70).length },
    { bucket: "<60",    count: students.filter((s) => s.overallPercent < 60).length },
  ];

  return {
    courseId: course.id,
    courseName: course.name,
    canViewAllGrades: true,
    students,
    distribution,
  };
}
