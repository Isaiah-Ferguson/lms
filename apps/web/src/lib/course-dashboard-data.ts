// ─── Types ────────────────────────────────────────────────────────────────────

export type AssignmentType = "MiniChallenge" | "Challenge" | "Project";

export interface LessonLink {
  title: string;
  href: string;
  type: "video" | "doc" | "link";
}

export interface Week {
  weekNumber: number;
  title: string;
  items: LessonLink[];
}

export interface Announcement {
  id: string;
  date: string; // ISO
  title: string;
  body: string;
  tag?: "DayOff" | "Event" | "Reminder" | "Info";
}

export interface Assignment {
  courseAssignmentId: string;
  templateKey: string;
  title: string;
  type: AssignmentType;
  weekNumber?: number;
}

export interface CourseInfo {
  id: string;
  title: string;
  subtitle: string;
  accentColor: string; // tailwind bg class
}

export interface Permissions {
  canEditAssignments: boolean;
}

export interface CourseDashboardData {
  course: CourseInfo;
  weeks: Week[];
  announcements: Announcement[];
  assignments: {
    miniChallenges: Assignment[];
    challenges: Assignment[];
    projects: Assignment[];
  };
  permissions: Permissions;
}

// ─── Stub ─────────────────────────────────────────────────────────────────────

export function getCourseDashboardData(courseId: string): CourseDashboardData | null {
  if (courseId !== "combine") return null; // only combine implemented so far

  return {
    course: {
      id: "combine",
      title: "Combine",
      subtitle: "CodeStack Academy — Combine",
      accentColor: "bg-blue-600",
    },

    weeks: [
      {
        weekNumber: 1,
        title: "Orientation & Tooling",
        items: [
          { title: "Welcome to CodeStack",         href: "/courses/combine/lessons/welcome",       type: "video" },
          { title: "Setting up your environment",  href: "/courses/combine/lessons/setup",         type: "doc"   },
          { title: "Git & GitHub crash course",    href: "/courses/combine/lessons/git-intro",     type: "video" },
          { title: "VS Code tips & tricks",        href: "/courses/combine/lessons/vscode-tips",   type: "link"  },
        ],
      },
      {
        weekNumber: 2,
        title: "HTML & CSS Foundations",
        items: [
          { title: "HTML document structure",      href: "/courses/combine/lessons/html-structure", type: "video" },
          { title: "CSS selectors & specificity",  href: "/courses/combine/lessons/css-selectors",  type: "video" },
          { title: "Flexbox & Grid",               href: "/courses/combine/lessons/layout",          type: "doc"   },
          { title: "MDN Web Docs",                 href: "https://developer.mozilla.org",            type: "link"  },
        ],
      },
      {
        weekNumber: 3,
        title: "JavaScript Essentials",
        items: [
          { title: "Variables, types & functions", href: "/courses/combine/lessons/js-basics",     type: "video" },
          { title: "DOM manipulation",             href: "/courses/combine/lessons/dom",            type: "video" },
          { title: "Events & callbacks",           href: "/courses/combine/lessons/events",         type: "doc"   },
        ],
      },
      {
        weekNumber: 4,
        title: "Intro to React",
        items: [
          { title: "Components & props",           href: "/courses/combine/lessons/react-components", type: "video" },
          { title: "State & useEffect",            href: "/courses/combine/lessons/react-state",      type: "video" },
          { title: "React docs",                   href: "https://react.dev",                         type: "link"  },
        ],
      },
    ],

    announcements: [
      {
        id: "ann-1",
        date: "2026-02-17T09:00:00Z",
        title: "Presidents' Day — No class",
        body: "The academy will be closed on Monday 17 Feb. Regular schedule resumes Tuesday.",
        tag: "DayOff",
      },
      {
        id: "ann-2",
        date: "2026-02-24T18:00:00Z",
        title: "Demo Day — Week 4",
        body: "All students present their Week 4 projects. Invite your friends and family!",
        tag: "Event",
      },
      {
        id: "ann-3",
        date: "2026-03-01T09:00:00Z",
        title: "Spring Break starts",
        body: "Spring break runs 1–7 March. Assignments due before 28 Feb.",
        tag: "Reminder",
      },
    ],

    assignments: {
      miniChallenges: [
        { courseAssignmentId: "ca_8d2ab411-13f5-4ed9", templateKey: "mc-1", title: "Semantic HTML page", type: "MiniChallenge", weekNumber: 1 },
        { courseAssignmentId: "ca_0cf24b20-31bc-4f90", templateKey: "mc-2", title: "CSS card component", type: "MiniChallenge", weekNumber: 2 },
        { courseAssignmentId: "ca_4e8f73dd-68a2-4d44", templateKey: "mc-3", title: "JS to-do list", type: "MiniChallenge", weekNumber: 3 },
        { courseAssignmentId: "ca_a0f5482a-3a42-4de7", templateKey: "mc-4", title: "React counter app", type: "MiniChallenge", weekNumber: 4 },
      ],
      challenges: [
        { courseAssignmentId: "ca_91de224f-f009-4775", templateKey: "ch-1", title: "Responsive landing page", type: "Challenge", weekNumber: 2 },
        { courseAssignmentId: "ca_45f6ac9e-bef9-4f88", templateKey: "ch-2", title: "Fetch & display API data", type: "Challenge", weekNumber: 3 },
        { courseAssignmentId: "ca_3d9ca2a6-f2e1-4221", templateKey: "ch-3", title: "Multi-component React app", type: "Challenge", weekNumber: 4 },
      ],
      projects: [
        { courseAssignmentId: "ca_5bc8d5e9-45d6-4cc5", templateKey: "pr-1", title: "Personal portfolio site", type: "Project" },
        { courseAssignmentId: "ca_127f77ce-1167-43da", templateKey: "pr-2", title: "Full-stack mini app", type: "Project" },
      ],
    },

    permissions: {
      canEditAssignments: true, // flip to false to hide admin UI
    },
  };
}
