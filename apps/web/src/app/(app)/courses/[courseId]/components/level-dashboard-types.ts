// ─── Shared types for the level dashboard and its cards/modals ───────────────

export interface LevelWeek {
  id?: string;
  weekNumber: number;
  title: string;
  dateRange: string;
  topics: string[];
  zoomUrl: string;
  detailsHref: string;
}

export interface LevelAnnouncement {
  id: string;
  date: string;
  title: string;
  body: string;
  tag?: "DayOff" | "Event" | "Reminder" | "Info";
}

export type AssignmentType = "MiniChallenge" | "Challenge" | "Project";

export interface LevelAssignment {
  id?: string;
  courseAssignmentId?: string;
  templateKey?: string;
  title: string;
  type: AssignmentType;
  weekNumber?: number;
  href: string;
}

export interface LevelData {
  courseTitle: string;       // e.g. "Level 1 — Web Foundations"
  courseMeta: string;        // e.g. "10-week programme · Oct 14 – Dec 27"
  description: string;       // matches the level description shown on the dashboard
  accentColor: string;       // tailwind bg class e.g. "bg-blue-500"
  gradient: string;          // tailwind bg-gradient-to-br from/via/to classes
  courseId: string;
  zoomUrl: string;
  announcements: LevelAnnouncement[];
  weeks: LevelWeek[];
  assignments: {
    miniChallenges: LevelAssignment[];
    challenges: LevelAssignment[];
    projects: LevelAssignment[];
  };
  permissions: { canEditAssignments: boolean };
}
