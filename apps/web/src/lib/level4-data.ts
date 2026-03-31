import type { LevelData } from "@/app/(app)/courses/[courseId]/LevelDashboardClient";

export function getLevel4Data(): LevelData {
  const level4ZoomUrl = "https://codestack.zoom.us/j/93949618291?pwd=dVQ5VkVmZ0JTOWlYR09ub3lLdURvZz09#success";

  return {
    courseId: "",
    courseTitle: "Level 4 — Full Stack App, Clean Architecture & DevOps",
    courseMeta:  "3-week programme · Apr 13 – Apr 30, 2026 · 113 hours",
    accentColor: "bg-orange-500",
    zoomUrl:     level4ZoomUrl,

    announcements: [
      {
        id: "ann-1",
        date: "2026-04-13T09:00:00Z",
        title: "Welcome to Level 4!",
        body:  "Final level — Full Stack App, Onion/Clean Architecture, and Capstone Presentations. First class is Monday 13 Apr.",
        tag:   "Info",
      },
      {
        id: "ann-2",
        date: "2026-05-01T09:00:00Z",
        title: "Transition Day Off — May 1",
        body:  "May 1 is a transition day off following Level 4 completion. Internship onboarding begins after this date.",
        tag:   "DayOff",
      },
      {
        id: "ann-3",
        date: "2026-04-30T18:00:00Z",
        title: "Capstone Demo Day & Internship Send-off",
        body:  "Final interviews, capstone demos, and internship send-off on Friday 30 Apr. Bring your best work!",
        tag:   "Event",
      },
    ],

    weeks: [
      {
        weekNumber: 1,
        title:      "Onion Architecture",
        dateRange:  "Apr 13 – Apr 17",
        zoomUrl:    level4ZoomUrl,
        detailsHref: "/courses/level-4/weeks/1",
        topics: [
          { label: "Onion / Clean Architecture overview" },
          { label: "Domain Layer (Entities, Interfaces, Business Rules)" },
          { label: "Application Layer (Use Cases, Services)" },
          { label: "Infrastructure Layer (EF Core, external services)" },
          { label: "Presentation Layer (API + Next.js frontend)" },
          { label: "Why Onion Architecture matters in real teams" },
          { label: "Mapping Onion Architecture to internship expectations" },
          { label: "Friday: Architecture code reviews, 'Is this logic in the right layer?' exercises" },
        ],
      },
      {
        weekNumber: 2,
        title:      "Portfolio & Business Redesign (Next.js)",
        dateRange:  "Apr 20 – Apr 24",
        zoomUrl:    level4ZoomUrl,
        detailsHref: "/courses/level-4/weeks/2",
        topics: [
          { label: "Portfolio best practices (what recruiters actually care about)" },
          { label: "Next.js for production-ready frontends" },
          { label: "Accessibility & performance basics" },
          { label: "Tailwind polish & responsive refinement" },
          { label: "Connecting portfolio projects to real GitHub repos" },
          { label: "Friday: Portfolio peer reviews, resume + portfolio alignment check" },
        ],
      },
      {
        weekNumber: 3,
        title:      "Capstone Presentations & Interview Readiness",
        dateRange:  "Apr 27 – Apr 30",
        zoomUrl:    level4ZoomUrl,
        detailsHref: "/courses/level-4/weeks/3",
        topics: [
          { label: "Capstone presentation skills" },
          { label: "Explaining technical decisions clearly" },
          { label: "Mock interviews (behavioral + technical)" },
          { label: "Live technical interview practice" },
          { label: "Internship expectations: tickets, standups, code reviews, documentation" },
          { label: "Writing clear technical documentation for ongoing projects" },
          { label: "Friday: Final interviews, capstone demos, internship send-off" },
        ],
      },
    ],

    assignments: {
      miniChallenges: [
        { id: "mc-w1-1", title: "Onion Architecture refactor exercise (starter API)", type: "MiniChallenge", weekNumber: 1, href: "#" },
        { id: "mc-w1-2", title: "Apply Onion structure to Contact Manager",           type: "MiniChallenge", weekNumber: 1, href: "#" },
      ],
      challenges: [
        { id: "ch-w1-1", title: "Update Capstone Technical Document",                 type: "Challenge", weekNumber: 1, href: "#" },
        { id: "ch-w1-2", title: "Test Full Stack Apps — check progress",              type: "Challenge", weekNumber: 1, href: "#" },
        { id: "ch-w2-1", title: "Update GitHub repos (README, screenshots, live links)", type: "Challenge", weekNumber: 2, href: "#" },
        { id: "ch-w3-1", title: "Mock Interview Participation",                       type: "Challenge", weekNumber: 3, href: "#" },
        { id: "ch-w3-2", title: "Technical Interview Assessment",                     type: "Challenge", weekNumber: 3, href: "#" },
      ],
      projects: [
        {
          id: "pr-w2-1",
          title: "Personal Portfolio (Next.js) — About, Projects, Skills, Contact",
          type: "Project", weekNumber: 2, href: "#",
        },
        {
          id: "pr-w2-2",
          title: "Business Redesign (Next.js) — structure, routing, clean UI",
          type: "Project", weekNumber: 2, href: "#",
        },
        { id: "pr-w3-1", title: "Capstone Final Presentation",                        type: "Project", weekNumber: 3, href: "#" },
        {
          id: "pr-w3-2",
          title: "Internship Project Documentation (overview, architecture, setup, known issues)",
          type: "Project", weekNumber: 3, href: "#",
        },
      ],
    },

    permissions: {
      canEditAssignments: true,
    },
  };
}
