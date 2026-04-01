// import type { LevelData } from "@/app/(app)/courses/[courseId]/LevelDashboardClient";

// export function getCombineData(): LevelData {
//   const combineZoomUrl = "https://codestack.zoom.us/j/93949618291?pwd=dVQ5VkVmZ0JTOWlYR09ub3lLdURvZz09#success";

//   return {
//     courseId: "",
//     courseTitle: "Combine — C# & Unity Foundations",
//     courseMeta:  "4-week programme · C#, Unity, Logic & Control Flow",
//     accentColor: "bg-blue-600",
//     zoomUrl:     combineZoomUrl,

//     announcements: [
//       {
//         id: "ann-1",
//         date: "2025-10-01T09:00:00Z",
//         title: "Welcome to Combine!",
//         body:  "This is the starting point for all CodeStack students. You'll learn C# fundamentals and Unity basics before moving into Level 1.",
//         tag:   "Info",
//       },
//       {
//         id: "ann-2",
//         date: "2025-10-24T18:00:00Z",
//         title: "Week 4 — Final Project Presentations",
//         body:  "Capstone presentations happen Friday of Week 4. Prepare your Unity project for peer review and instructor feedback.",
//         tag:   "Event",
//       },
//     ],

//     weeks: [
//       {
//         weekNumber: 1,
//         title:      "C# Foundations",
//         dateRange:  "Week 1",
//         zoomUrl:    combineZoomUrl,
//         detailsHref: "/courses/combine/weeks/1",
//         topics: [
//           { label: "Pseudocode & Flowcharts" },
//           { label: "C# Classes & Methods" },
//           { label: "Input/Output (Console.WriteLine, Console.Write, Console.ReadLine)" },
//           { label: "Variables & Data Types" },
//           { label: "Arithmetic & Assignment Operators" },
//           { label: "Friday: Debugging workshop, group review of operators & data types" },
//         ],
//       },
//       {
//         weekNumber: 2,
//         title:      "Logic & Control Flow",
//         dateRange:  "Week 2",
//         zoomUrl:    combineZoomUrl,
//         detailsHref: "/courses/combine/weeks/2",
//         topics: [
//           { label: "Variables & Data Types (reinforcement)" },
//           { label: "Reference Data Types — Arrays, Lists" },
//           { label: "Conditional Statements (if, else, switch)" },
//           { label: "Input Validation (TryParse)" },
//           { label: "Loops (while, for, do while)" },
//           { label: "Friday: Group coding challenges (FizzBuzz variants), Q&A on conditionals & loops" },
//         ],
//       },
//       {
//         weekNumber: 3,
//         title:      "Unity Intro",
//         dateRange:  "Week 3",
//         zoomUrl:    combineZoomUrl,
//         detailsHref: "/courses/combine/weeks/3",
//         topics: [
//           { label: "Methods (review in Unity context)" },
//           { label: "Lists & Collections" },
//           { label: "Unity UI Basics (Buttons, Text, Scenes)" },
//           { label: "Date/Time usage" },
//           { label: "Audio Integration" },
//           { label: "Friday: Mini Unity game jam (pairs/groups), scene transitions + UI walkthrough" },
//         ],
//       },
//       {
//         weekNumber: 4,
//         title:      "Project Integration",
//         dateRange:  "Week 4",
//         zoomUrl:    combineZoomUrl,
//         detailsHref: "/courses/combine/weeks/4",
//         topics: [
//           { label: "Pull together Weeks 1–3 concepts in a structured mini-capstone" },
//           { label: "Select one Unity Challenge and expand into a polished project" },
//           { label: "Add data validation + replayability" },
//           { label: "Friday: Project presentations & peer code review, instructor feedback" },
//         ],
//       },
//     ],

//     assignments: {
//       miniChallenges: [
//         { id: "mc-w1-1", title: "Say Hello",              type: "MiniChallenge", weekNumber: 1, href: "#" },
//         { id: "mc-w1-2", title: "Add 2 Numbers",          type: "MiniChallenge", weekNumber: 1, href: "#" },
//         { id: "mc-w1-3", title: "Asking Questions",       type: "MiniChallenge", weekNumber: 1, href: "#" },
//         { id: "mc-w1-4", title: "Greater Than / Less Than", type: "MiniChallenge", weekNumber: 1, href: "#" },
//         { id: "mc-w1-5", title: "Mad Lib",                type: "MiniChallenge", weekNumber: 1, href: "#" },
//         { id: "mc-w2-1", title: "Odd or Even",            type: "MiniChallenge", weekNumber: 2, href: "#" },
//         { id: "mc-w2-2", title: "Reverse It",             type: "MiniChallenge", weekNumber: 2, href: "#" },
//         { id: "mc-w2-3", title: "Guess It",               type: "MiniChallenge", weekNumber: 2, href: "#" },
//       ],
//       challenges: [
//         { id: "ch-w3-1", title: "Unity Essentials — Digital Clock + Student Directory (mini-capstone)", type: "Challenge", weekNumber: 3, href: "#" },
//         { id: "ch-w3-2", title: "All for One (Recreate console mini-challenges in Unity)",              type: "Challenge", weekNumber: 3, href: "#" },
//         { id: "ch-w3-3", title: "Choose Your Own Adventure",                                            type: "Challenge", weekNumber: 3, href: "#" },
//         { id: "ch-w3-4", title: "Trivia",                                                               type: "Challenge", weekNumber: 3, href: "#" },
//       ],
//       projects: [
//         { id: "pr-w4-1", title: "Unity Capstone — Polished project (expanded Unity Challenge)", type: "Project", weekNumber: 4, href: "#" },
//       ],
//     },

//     permissions: {
//       canEditAssignments: true,
//     },
//   };
// }
