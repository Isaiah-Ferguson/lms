// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeekTopic {
  label: string;
}

export interface Level1Week {
  weekNumber: number;
  title: string;
  dateRange: string;       // e.g. "Oct 14 – 19"
  topics: WeekTopic[];
  zoomUrl: string;         // class link
  detailsHref: string;     // → /courses/level-1/weeks/[n]
}

export interface Level1Announcement {
  id: string;
  date: string;            // ISO
  title: string;
  body: string;
  tag?: "DayOff" | "Event" | "Reminder" | "Info";
}

export type AssignmentType = "MiniChallenge" | "Challenge" | "Project";

export interface Level1Assignment {
  id: string;
  title: string;
  type: AssignmentType;
  weekNumber?: number;
  href: string;
}

export interface Level1Permissions {
  canEditAssignments: boolean;
}

export interface Level1Data {
  announcements: Level1Announcement[];
  zoomUrl: string;
  weeks: Level1Week[];
  assignments: {
    miniChallenges: Level1Assignment[];
    challenges: Level1Assignment[];
    projects: Level1Assignment[];
  };
  permissions: Level1Permissions;
}

// ─── Stub ─────────────────────────────────────────────────────────────────────

export function getLevel1Data(): Level1Data {
  const level1ZoomUrl = "https://codestack.zoom.us/j/93949618291?pwd=dVQ5VkVmZ0JTOWlYR09ub3lLdURvZz09#success";

  return {
    // The Zoom link is surfaced as a pinned card in the first row of the grid
    zoomUrl: level1ZoomUrl,

    announcements: [
      {
        id: "ann-1",
        date: "2025-10-14T09:00:00Z",
        title: "Welcome to Level 1!",
        body: "First class is Monday 14 Oct. Make sure your laptop is set up before you arrive.",
        tag: "Info",
      },
      {
        id: "ann-2",
        date: "2025-11-11T09:00:00Z",
        title: "Veterans Day — No class",
        body: "The academy is closed Tuesday 11 Nov. Assignments due that day are extended to Wed.",
        tag: "DayOff",
      },
      {
        id: "ann-3",
        date: "2025-11-25T09:00:00Z",
        title: "Thanksgiving Break",
        body: "No class 25–28 Nov. Enjoy the break — Week 7 resumes Monday 1 Dec.",
        tag: "DayOff",
      },
      {
        id: "ann-4",
        date: "2025-12-15T18:00:00Z",
        title: "Level 1 Demo Day",
        body: "Present your portfolio project to instructors, peers, and guests. 6 PM sharp.",
        tag: "Event",
      },
    ],

    weeks: [
      {
        weekNumber: 1,
        title: "Orientation & Tooling",
        dateRange: "Oct 14 – 19",
        zoomUrl: level1ZoomUrl,
        detailsHref: "/courses/level-1/weeks/1",
        topics: [
          { label: "Intro to Web Development" },
          { label: "How the internet works" },
          { label: "Setting up VS Code" },
          { label: "GitHub basics" },
        ],
      },
      {
        weekNumber: 2,
        title: "HTML Foundations",
        dateRange: "Oct 21 – 26",
        zoomUrl: level1ZoomUrl,
        detailsHref: "/courses/level-1/weeks/2",
        topics: [
          { label: "HTML structure & semantics" },
          { label: "Headings, lists, links, images" },
          { label: "Forms & inputs" },
          { label: "Accessibility basics" },
        ],
      },
      {
        weekNumber: 3,
        title: "CSS Fundamentals",
        dateRange: "Oct 28 – Nov 2",
        zoomUrl: level1ZoomUrl,
        detailsHref: "/courses/level-1/weeks/3",
        topics: [
          { label: "CSS selectors & specificity" },
          { label: "Box model & spacing" },
          { label: "Colors, fonts & units" },
          { label: "Responsive design basics" },
        ],
      },
      {
        weekNumber: 4,
        title: "Flexbox & Grid",
        dateRange: "Nov 4 – 9",
        zoomUrl: level1ZoomUrl,
        detailsHref: "/courses/level-1/weeks/4",
        topics: [
          { label: "Flexbox" },
          { label: "CSS Grid" },
          { label: "Layout patterns" },
          { label: "Mobile-first design" },
        ],
      },
      {
        weekNumber: 5,
        title: "Bootstrap & Figma",
        dateRange: "Nov 11 – 16",
        zoomUrl: level1ZoomUrl,
        detailsHref: "/courses/level-1/weeks/5",
        topics: [
          { label: "Bootstrap 5 — grid & utilities" },
          { label: "Bootstrap components" },
          { label: "Customising Bootstrap" },
          { label: "Figma intro & wireframing" },
        ],
      },
      {
        weekNumber: 6,
        title: "JavaScript Essentials",
        dateRange: "Nov 18 – 23",
        zoomUrl: level1ZoomUrl,
        detailsHref: "/courses/level-1/weeks/6",
        topics: [
          { label: "JavaScript variables & types" },
          { label: "Functions & scope" },
          { label: "Arrays & objects" },
          { label: "Control flow" },
        ],
      },
      {
        weekNumber: 7,
        title: "DOM & Async JS",
        dateRange: "Dec 1 – 6",
        zoomUrl: level1ZoomUrl,
        detailsHref: "/courses/level-1/weeks/7",
        topics: [
          { label: "DOM manipulation" },
          { label: "Events & listeners" },
          { label: "Fetch API & JSON" },
          { label: "Async / await basics" },
        ],
      },
      {
        weekNumber: 8,
        title: "Git & Deployment",
        dateRange: "Dec 8 – 13",
        zoomUrl: level1ZoomUrl,
        detailsHref: "/courses/level-1/weeks/8",
        topics: [
          { label: "Git branching & pull requests" },
          { label: "Deploying with GitHub Pages" },
          { label: "Code review workflow" },
          { label: "Portfolio project kickoff" },
        ],
      },
      {
        weekNumber: 9,
        title: "Portfolio Project",
        dateRange: "Dec 15 – 20",
        zoomUrl: level1ZoomUrl,
        detailsHref: "/courses/level-1/weeks/9",
        topics: [
          { label: "Portfolio project work" },
          { label: "Instructor 1-on-1 reviews" },
          { label: "Peer code review" },
          { label: "Demo Day prep" },
        ],
      },
      {
        weekNumber: 10,
        title: "Demo Day",
        dateRange: "Dec 22 – 27",
        zoomUrl: level1ZoomUrl,
        detailsHref: "/courses/level-1/weeks/10",
        topics: [
          { label: "Demo Day presentations" },
          { label: "Level 1 retrospective" },
          { label: "Level 2 preview" },
          { label: "Certificates & celebration" },
        ],
      },
    ],

    assignments: {
      miniChallenges: [
        { id: "mc-1", title: "Semantic HTML page",          type: "MiniChallenge", weekNumber: 2,  href: "/courses/level-1/assignments/mc-1" },
        { id: "mc-2", title: "Style a blog post",           type: "MiniChallenge", weekNumber: 3,  href: "/courses/level-1/assignments/mc-2" },
        { id: "mc-3", title: "Flexbox nav bar",             type: "MiniChallenge", weekNumber: 4,  href: "/courses/level-1/assignments/mc-3" },
        { id: "mc-4", title: "Bootstrap card grid",         type: "MiniChallenge", weekNumber: 5,  href: "/courses/level-1/assignments/mc-4" },
        { id: "mc-5", title: "JS quiz app",                 type: "MiniChallenge", weekNumber: 6,  href: "/courses/level-1/assignments/mc-5" },
        { id: "mc-6", title: "Fetch & display weather",     type: "MiniChallenge", weekNumber: 7,  href: "/courses/level-1/assignments/mc-6" },
      ],
      challenges: [
        { id: "ch-1", title: "Responsive landing page",     type: "Challenge",     weekNumber: 4,  href: "/courses/level-1/assignments/ch-1" },
        { id: "ch-2", title: "Figma → HTML/CSS build",      type: "Challenge",     weekNumber: 5,  href: "/courses/level-1/assignments/ch-2" },
        { id: "ch-3", title: "Interactive to-do list",      type: "Challenge",     weekNumber: 7,  href: "/courses/level-1/assignments/ch-3" },
        { id: "ch-4", title: "GitHub profile page clone",   type: "Challenge",     weekNumber: 8,  href: "/courses/level-1/assignments/ch-4" },
      ],
      projects: [
        { id: "pr-1", title: "Personal portfolio website",  type: "Project",                       href: "/courses/level-1/assignments/pr-1" },
        { id: "pr-2", title: "Multi-page business site",    type: "Project",                       href: "/courses/level-1/assignments/pr-2" },
      ],
    },

    permissions: {
      canEditAssignments: true,
    },
  };
}
