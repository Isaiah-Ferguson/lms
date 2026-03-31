// ─── Types (shared shape with level1-data) ────────────────────────────────────

export interface WeekTopic {
  label: string;
}

export interface Level2Week {
  weekNumber: number;
  title: string;
  dateRange: string;
  topics: WeekTopic[];
  zoomUrl: string;
  detailsHref: string;
}

export interface Level2Announcement {
  id: string;
  date: string;
  title: string;
  body: string;
  tag?: "DayOff" | "Event" | "Reminder" | "Info";
}

export type AssignmentType = "MiniChallenge" | "Challenge" | "Project";

export interface Level2Assignment {
  id: string;
  title: string;
  type: AssignmentType;
  weekNumber?: number;
  href: string;
}

export interface Level2Permissions {
  canEditAssignments: boolean;
}

export interface Level2Data {
  announcements: Level2Announcement[];
  zoomUrl: string;
  weeks: Level2Week[];
  assignments: {
    miniChallenges: Level2Assignment[];
    challenges: Level2Assignment[];
    projects: Level2Assignment[];
  };
  permissions: Level2Permissions;
}

// ─── Stub ─────────────────────────────────────────────────────────────────────

export function getLevel2Data(): Level2Data {
  const level2ZoomUrl = "https://codestack.zoom.us/j/93949618291?pwd=dVQ5VkVmZ0JTOWlYR09ub3lLdURvZz09#success";

  return {
    zoomUrl: level2ZoomUrl,

    announcements: [
      {
        id: "ann-1",
        date: "2026-01-05T09:00:00Z",
        title: "Welcome to Level 2!",
        body: "First class is Monday 5 Jan. Focus this level: API, Async/Await, Fetch, and Next.js.",
        tag: "Info",
      },
      {
        id: "ann-2",
        date: "2026-01-19T09:00:00Z",
        title: "Martin Luther King Jr. Day — No class",
        body: "The academy is closed Monday 19 Jan in observance of MLK Day. Regular schedule resumes Tuesday.",
        tag: "DayOff",
      },
      {
        id: "ann-3",
        date: "2026-02-06T09:00:00Z",
        title: "Lincoln's Holiday — No class",
        body: "The academy is closed Friday 6 Feb for Lincoln's Holiday. Week 5 schedule adjusts accordingly.",
        tag: "DayOff",
      },
      {
        id: "ann-4",
        date: "2026-02-13T18:00:00Z",
        title: "Level 2 Wrap-up & Demo",
        body: "Final class of Level 2 — project reviews, Level 2 Q&A, and preview of Level 3.",
        tag: "Event",
      },
    ],

    weeks: [
      {
        weekNumber: 1,
        title: "API Foundations",
        dateRange: "Jan 5 – Jan 9",
        zoomUrl: level2ZoomUrl,
        detailsHref: "/courses/level-2/weeks/1",
        topics: [
          { label: "Controllers & Routes Return Types" },
          { label: "Services & Dependency Injection" },
          { label: "Interfaces & Models" },
          { label: "Azure SQL Database Creation" },
          { label: "Postman testing" },
        ],
      },
      {
        weekNumber: 2,
        title: "API Expansion & Tailwind Intro",
        dateRange: "Jan 12 – Jan 16",
        zoomUrl: level2ZoomUrl,
        detailsHref: "/courses/level-2/weeks/2",
        topics: [
          { label: "API Recap" },
          { label: "Hosting on Azure" },
          { label: "CORS Policy" },
          { label: "Adding Swagger UI" },
          { label: "Async/await with fetch" },
          { label: "Intro to Tailwind CSS" },
        ],
      },
      {
        weekNumber: 3,
        title: "Async Data & Tailwind Grid",
        dateRange: "Jan 20 – Jan 23",
        zoomUrl: level2ZoomUrl,
        detailsHref: "/courses/level-2/weeks/3",
        topics: [
          { label: "Tailwind grid + utilities" },
          { label: "Async/await with fetch (recovery)" },
          { label: "JS Higher Order Methods (map, filter, reduce)" },
          { label: "Applied to fetched API data & arrays" },
          { label: "Digimon Grid Tailwind Lecture" },
        ],
      },
      {
        weekNumber: 4,
        title: "Applied API Practice",
        dateRange: "Jan 26 – Jan 30",
        zoomUrl: level2ZoomUrl,
        detailsHref: "/courses/level-2/weeks/4",
        topics: [
          { label: "Strengthening async fetch (multiple endpoints, error handling)" },
          { label: "Structuring API responses for Next.js readiness" },
          { label: "IActionResult" },
        ],
      },
      {
        weekNumber: 5,
        title: "Next.js Foundations",
        dateRange: "Feb 2 – Feb 5",
        zoomUrl: level2ZoomUrl,
        detailsHref: "/courses/level-2/weeks/5",
        topics: [
          { label: "What Next.js is" },
          { label: "Project setup (Next.js App Router)" },
          { label: "JSX + Components (React concepts inside Next)" },
          { label: "Props & component composition" },
          { label: "Event handling (onClick, onChange)" },
          { label: "State with useState" },
          { label: "Effects with useEffect" },
          { label: "Fetching API data in Next.js client components" },
          { label: "Intro to file-based routing" },
        ],
      },
      {
        weekNumber: 6,
        title: "Next.js Deepening + TypeScript Evaluations",
        dateRange: "Feb 9 – Feb 13",
        zoomUrl: level2ZoomUrl,
        detailsHref: "/courses/level-2/weeks/6",
        topics: [
          { label: "Client Components vs Server Components" },
          { label: "Static & dynamic routes ([id])" },
          { label: "Data fetching patterns in Next.js" },
          { label: "Review: useState, useEffect, Props & component flow" },
          { label: "Friday: routing walkthrough, project reviews, Level 2 wrap-up Q&A" },
        ],
      },
    ],

    assignments: {
      miniChallenges: [
        { id: "mc-w1-1", title: "Say Hello (endpoint)",          type: "MiniChallenge", weekNumber: 1, href: "https://lms.codestack.co/mod/assign/view.php?id=1938" },
        { id: "mc-w1-2", title: "Add 2 Numbers (endpoint)",      type: "MiniChallenge", weekNumber: 1, href: "https://lms.codestack.co/mod/assign/view.php?id=1946" },
        { id: "mc-w1-3", title: "MiniChallenge 2–4 (endpoints)", type: "MiniChallenge", weekNumber: 1, href: "https://lms.codestack.co/mod/assign/view.php?id=1940" },
        { id: "mc-w1-4", title: "MiniChallenge 5–7 (endpoints)", type: "MiniChallenge", weekNumber: 1, href: "https://lms.codestack.co/mod/assign/view.php?id=1942" },
        { id: "mc-w1-5", title: "MiniChallenge 8–10 (endpoints)",type: "MiniChallenge", weekNumber: 1, href: "https://lms.codestack.co/mod/assign/view.php?id=1944" },
      ],
      challenges: [
        { id: "ch-w2-1", title: "SQL Murder Mystery",                                   type: "Challenge", weekNumber: 2, href: "https://lms.codestack.co/mod/assign/view.php?id=1887" },
        { id: "ch-w2-2", title: "All For One API",                                      type: "Challenge", weekNumber: 2, href: "https://lms.codestack.co/mod/assign/view.php?id=1934" },
        { id: "ch-w2-3", title: "Rock Paper Scissors Lizard Spock — Prototype + Endpoint", type: "Challenge", weekNumber: 2, href: "https://lms.codestack.co/mod/assign/view.php?id=1898" },
        { id: "ch-w3-1", title: "RPSLS — Tailwind styled (finalized)",                 type: "Challenge", weekNumber: 3, href: "https://lms.codestack.co/mod/assign/view.php?id=1897" },
        { id: "ch-w4-1", title: "Pokémon API Challenge",                                type: "Challenge", weekNumber: 4, href: "https://lms.codestack.co/mod/assign/view.php?id=1905" },
        { id: "ch-w4-2", title: "RPSLS Turn In",                                        type: "Challenge", weekNumber: 4, href: "https://lms.codestack.co/mod/assign/view.php?id=1897" },
        { id: "ch-w4-3", title: "BestTA Controller Quiz",                               type: "Challenge", weekNumber: 4, href: "https://lms.codestack.co/mod/assign/view.php?id=2309" },
      ],
      projects: [
        { id: "pr-w5-1", title: "RPSLS — Next.js version",        type: "Project", weekNumber: 5, href: "#" },
        { id: "pr-w5-2", title: "Mini Fetching Assignment",        type: "Project", weekNumber: 5, href: "#" },
        { id: "pr-w5-3", title: "Full Stack App — Figma Planning", type: "Project", weekNumber: 5, href: "#" },
        { id: "pr-w5-4", title: "Array Quiz",                      type: "Project", weekNumber: 5, href: "#" },
        { id: "pr-w6-1", title: "Advice Generator (Next.js)",      type: "Project", weekNumber: 6, href: "#" },
        { id: "pr-w6-2", title: "Level 2 Evaluation API",          type: "Project", weekNumber: 6, href: "#" },
        { id: "pr-w6-3", title: "Contact Manager",                 type: "Project", weekNumber: 6, href: "https://www.figma.com/design/XTuKI8DicAb5MrHsAbTDN9/Untitled?node-id=0-1" },
      ],
    },

    permissions: {
      canEditAssignments: true,
    },
  };
}
