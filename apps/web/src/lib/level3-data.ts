// import type { LevelData } from "@/app/(app)/courses/[courseId]/LevelDashboardClient";

// export function getLevel3Data(): LevelData {
//   const level3ZoomUrl = "https://codestack.zoom.us/j/93949618291?pwd=dVQ5VkVmZ0JTOWlYR09ub3lLdURvZz09#success";

//   return {
//     courseId: "",
//     courseTitle: "Level 3 — TypeScript, Auth & Database",
//     courseMeta:  "6-week programme · Feb 23 – Apr 3, 2026 · 210 hours",
//     accentColor: "bg-emerald-500",
//     zoomUrl:     level3ZoomUrl,

//     announcements: [
//       {
//         id: "ann-1",
//         date: "2026-02-23T09:00:00Z",
//         title: "Welcome to Level 3!",
//         body:  "Focus this level: TypeScript, JWT/Auth, Database, and Professional Development. First class is Monday 23 Feb.",
//         tag:   "Info",
//       },
//       {
//         id: "ann-2",
//         date: "2026-04-03T18:00:00Z",
//         title: "Level 3 Wrap-up & Evaluations",
//         body:  "Final week includes Blog deployment, CI/CD pipeline demo, and evaluation assessments. No holidays this level.",
//         tag:   "Event",
//       },
//     ],

//     weeks: [
//       {
//         weekNumber: 1,
//         title:      "TypeScript & Next.js Deep Dive",
//         dateRange:  "Feb 23 – Feb 27",
//         zoomUrl:    level3ZoomUrl,
//         detailsHref: "/courses/level-3/weeks/1",
//         topics: [
//           { label: "TypeScript basics" },
//           { label: "Interfaces vs Types" },
//           { label: "Generics" },
//           { label: "Next.js Routing & Dynamic Routing" },
//           { label: "useContext & State Management" },
//           { label: "Full Stack App Presentations — choose which apps to build" },
//           { label: "Friday: TS vs JS coding drills, Routing & caching workshop" },
//         ],
//       },
//       {
//         weekNumber: 2,
//         title:      "Database & API Foundations (Blog BE)",
//         dateRange:  "Mar 2 – Mar 6",
//         zoomUrl:    level3ZoomUrl,
//         detailsHref: "/courses/level-3/weeks/2",
//         topics: [
//           { label: "Database creation (SQL / Azure)" },
//           { label: "N-Tier API Architecture (controllers → services → DB)" },
//           { label: "EF Core setup & dependency injection" },
//           { label: "Async DB queries (CRUD)" },
//           { label: "Account creation (register user)" },
//           { label: "Friday: EF Core query practice, debugging dependency injection" },
//         ],
//       },
//       {
//         weekNumber: 3,
//         title:      "Authentication & Frontend Setup (Blog)",
//         dateRange:  "Mar 9 – Mar 13",
//         zoomUrl:    level3ZoomUrl,
//         detailsHref: "/courses/level-3/weeks/3",
//         topics: [
//           { label: "Salt & Hash (secure passwords)" },
//           { label: "Auth in Program.cs (JWT, middleware, attributes)" },
//           { label: "Blog Frontend setup in Next.js" },
//           { label: "Login page & fetch to API" },
//           { label: "Friday: Auth debugging lab, frontend login code review" },
//         ],
//       },
//       {
//         weekNumber: 4,
//         title:      "Blog Frontend Integration",
//         dateRange:  "Mar 16 – Mar 20",
//         zoomUrl:    level3ZoomUrl,
//         detailsHref: "/courses/level-3/weeks/4",
//         topics: [
//           { label: "Fetching blog posts from API" },
//           { label: "Blog page layout (list + detail)" },
//           { label: "Dashboard (profile + CRUD posts)" },
//           { label: "Error handling & validation" },
//           { label: "Friday: Blog API error handling drills, dashboard peer code review" },
//         ],
//       },
//       {
//         weekNumber: 5,
//         title:      "Applied Projects & Career Prep",
//         dateRange:  "Mar 23 – Mar 27",
//         zoomUrl:    level3ZoomUrl,
//         detailsHref: "/courses/level-3/weeks/5",
//         topics: [
//           { label: "API rebuild challenge (Pokémon API Rebuild)" },
//           { label: "Jobs API exploration — Jobs That Interest You" },
//           { label: "LinkedIn best practices" },
//           { label: "Technical interview preparation" },
//           { label: "Portfolio storytelling" },
//           { label: "Friday: LinkedIn profile review, mock interview warm-up" },
//         ],
//       },
//       {
//         weekNumber: 6,
//         title:      "DevOps & Evaluations",
//         dateRange:  "Mar 30 – Apr 3",
//         zoomUrl:    level3ZoomUrl,
//         detailsHref: "/courses/level-3/weeks/6",
//         topics: [
//           { label: "Intro to DevOps (Azure DevOps / GitHub Actions)" },
//           { label: "Repos, Boards, Pipelines basics" },
//           { label: "Blog deployment (Vercel frontend + Azure API)" },
//           { label: "Evaluations" },
//           { label: "Full Stack App check-in" },
//           { label: "Friday: DevOps demo — pipeline build & deploy, peer evaluation prep" },
//         ],
//       },
//     ],

//     assignments: {
//       miniChallenges: [
//         { id: "mc-w1-1", title: "TypeScript conversion mini-project",       type: "MiniChallenge", weekNumber: 1, href: "#" },
//         { id: "mc-w1-2", title: "Next.js dynamic routing demo",             type: "MiniChallenge", weekNumber: 1, href: "#" },
//         { id: "mc-w3-1", title: "Weather App Rebuild",                      type: "MiniChallenge", weekNumber: 3, href: "#" },
//       ],
//       challenges: [
//         { id: "ch-w1-1", title: "Full Stack App Figma",                     type: "Challenge", weekNumber: 1, href: "#" },
//         { id: "ch-w1-2", title: "Project Details and Pitch",                type: "Challenge", weekNumber: 1, href: "#" },
//         { id: "ch-w2-1", title: "Full Stack Pitch",                         type: "Challenge", weekNumber: 2, href: "#" },
//         { id: "ch-w2-2", title: "Social Media Dashboard (Using Components)",type: "Challenge", weekNumber: 2, href: "#" },
//         { id: "ch-w5-1", title: "Pokémon Rebuild in Next.js",               type: "Challenge", weekNumber: 5, href: "#" },
//         { id: "ch-w5-2", title: "Jobs That Interest You",                   type: "Challenge", weekNumber: 5, href: "#" },
//         { id: "ch-w5-3", title: "Trinchero Farms Resume Edits (if applicable)", type: "Challenge", weekNumber: 5, href: "#" },
//       ],
//       projects: [
//         { id: "pr-w3-1", title: "Resume V1",                                type: "Project", weekNumber: 3, href: "#" },
//         { id: "pr-w4-1", title: "Resume V2",                                type: "Project", weekNumber: 4, href: "#" },
//         { id: "pr-w4-2", title: "You at a Glance (portfolio project)",      type: "Project", weekNumber: 4, href: "#" },
//         { id: "pr-w6-1", title: "Blog Project Deployment (CI/CD)",          type: "Project", weekNumber: 6, href: "#" },
//         { id: "pr-w6-2", title: "Evaluation Assessments",                   type: "Project", weekNumber: 6, href: "#" },
//       ],
//     },

//     permissions: {
//       canEditAssignments: true,
//     },
//   };
// }
