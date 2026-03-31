import { getCourseAssignments } from "@/lib/course-assignment-instances";

export interface WeekCodeArtifact {
  id: string;
  label: string;
  downloadUrl: string;
}

export interface WeekVideo {
  id: string;
  title: string;
  order: number;
  videoWatchUrl: string;
  codeArtifacts: WeekCodeArtifact[];
}

export interface WeekDetails {
  course: {
    id: string;
    title: string;
    year: string;
  };
  weekNumber: number;
  videos: WeekVideo[];
  assignments: {
    courseAssignmentId: string;
    templateKey: string;
    title: string;
    href: string;
  }[];
  permissions: {
    canUploadWeekMedia: boolean;
  };
}

const COURSE_META: Record<string, { title: string; year: string }> = {
  combine: { title: "Combine — C# & Unity Foundations", year: "2025" },
  "level-1": { title: "Level 1 — Web Foundations", year: "2025" },
  "level-2": { title: "Level 2 — API, Async/Await & Next.js", year: "2026" },
  "level-3": { title: "Level 3 — TypeScript, Auth & Database", year: "2026" },
  "level-4": { title: "Level 4 — Full Stack App, Clean Architecture & DevOps", year: "2026" },
};

export function getWeekDetails(courseId: string, weekNumber: number): WeekDetails {
  const course = COURSE_META[courseId] ?? {
    title: "CodeStack Course",
    year: String(new Date().getFullYear()),
  };

  const weekTag = `W${weekNumber}`;

  return {
    course: {
      id: courseId,
      title: course.title,
      year: course.year,
    },
    weekNumber,
    videos: [
      {
        id: `${courseId}-${weekTag}-video-1`,
        title: `Week ${weekNumber}: Kickoff + Concepts`,
        order: 1,
        videoWatchUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        codeArtifacts: [
          {
            id: `${courseId}-${weekTag}-code-1`,
            label: "Starter Files.zip",
            downloadUrl: "https://example.com/downloads/starter-files.zip",
          },
          {
            id: `${courseId}-${weekTag}-code-2`,
            label: "Lecture Slides.pdf",
            downloadUrl: "https://example.com/downloads/lecture-slides.pdf",
          },
        ],
      },
      {
        id: `${courseId}-${weekTag}-video-2`,
        title: `Week ${weekNumber}: Live Build Walkthrough`,
        order: 2,
        videoWatchUrl: "https://www.youtube.com/embed/ysz5S6PUM-U",
        codeArtifacts: [
          {
            id: `${courseId}-${weekTag}-code-3`,
            label: "Walkthrough Repo Snapshot.zip",
            downloadUrl: "https://example.com/downloads/walkthrough-snapshot.zip",
          },
        ],
      },
      {
        id: `${courseId}-${weekTag}-video-3`,
        title: `Week ${weekNumber}: Q&A + Refactor Session`,
        order: 3,
        videoWatchUrl: "https://www.youtube.com/embed/jNQXAC9IVRw",
        codeArtifacts: [
          {
            id: `${courseId}-${weekTag}-code-4`,
            label: "Refactor Exercise.zip",
            downloadUrl: "https://example.com/downloads/refactor-exercise.zip",
          },
          {
            id: `${courseId}-${weekTag}-code-5`,
            label: "Answer Key.diff",
            downloadUrl: "https://example.com/downloads/answer-key.diff",
          },
        ],
      },
    ],
    assignments: getCourseAssignments(courseId)
      .filter((assignment) => assignment.weekNumber === weekNumber)
      .map((assignment) => ({
        courseAssignmentId: assignment.courseAssignmentId,
        templateKey: assignment.templateKey,
        title: assignment.title,
        href: `/courses/${courseId}/assignments/${assignment.courseAssignmentId}`,
      })),
    permissions: {
      canUploadWeekMedia: true,
    },
  };
}
