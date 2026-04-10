// ─── Types ────────────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: string; // emoji / lucide name — resolved in the Sidebar component
}

export interface CourseCard {
  id: string;
  title: string;
  description: string;
  level: number | null; // null = "Combine" (all levels)
  yearLabel: string;    // e.g. "2025–26"
  href: string;
  badge?: string;       // e.g. "Current", "Upcoming"
  color: string;        // tailwind bg class for the card accent
}

export interface UserInfo {
  name: string;
  avatarUrl: string | null; // null → show initials fallback
  isOnProbation?: boolean;
}

export interface DashboardData {
  nav: NavItem[];
  cards: CourseCard[];
  currentLevel: number; // 1–4 based on enrolment year
  user: UserInfo;
}

// ─── Year → Level mapping ─────────────────────────────────────────────────────
// Academic year is determined by the start year of the cohort.
// 2025-26 → Level 1, 2026-27 → Level 2, etc.

function levelFromYear(cohortStartYear: number): number {
  const base = 2025;
  const level = cohortStartYear - base + 1;
  return Math.min(Math.max(level, 1), 4);
}

// ─── API-based data ───────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export async function getDashboardDataFromApi(token: string): Promise<DashboardData> {
  const response = await fetch(`${API_BASE}/api/home/dashboard`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard data: ${response.status}`);
  }

  const data = await response.json() as {
    years: Array<{ id: string; label: string; startDate: string; endDate: string; isActive: boolean }>;
    levels: Array<{ id: string; yearId: string; key: string; title: string; description: string; isArchived: boolean }>;
    enrollmentsByYear: Record<string, string[]>;
    user: { id: string; name: string; role: string; avatarUrl: string | null; isOnProbation: boolean };
    permissions: { canManageYears: boolean; canViewAllLevels: boolean; canViewEnrolledOnly: boolean };
  };

  const activeYear = data.years.find(y => y.isActive) ?? data.years[0];
  const enrolledLevelIds = activeYear ? (data.enrollmentsByYear[activeYear.id] ?? []) : [];
  const enrolledLevels = data.levels.filter(level => enrolledLevelIds.includes(level.id));

  // Build navigation based on enrollments
  const nav: NavItem[] = [];

  // Get all levels for the active year (not just enrolled ones for admins)
  const activeLevels = data.levels.filter(level => level.yearId === activeYear?.id);

  // Add Combine if enrolled or admin
  const combineLevel = activeLevels.find(l => l.key === "combine");
  if (combineLevel && (enrolledLevelIds.includes(combineLevel.id) || data.permissions.canViewAllLevels)) {
    nav.push({ label: "Combine", href: `/courses/${combineLevel.id}`, icon: "grid" });
  }

  // Add Level 1-4 if enrolled or admin
  for (let i = 1; i <= 4; i++) {
    const levelKey = `level-${i}`;
    const level = activeLevels.find(l => l.key === levelKey);
    if (level && (enrolledLevelIds.includes(level.id) || data.permissions.canViewAllLevels)) {
      nav.push({ label: `Level ${i}`, href: `/courses/${level.id}`, icon: i.toString() });
    }
  }

  // Always show Calendar and Grades
  nav.push({ label: "Calendar", href: "/calendar", icon: "calendar" });
  nav.push({ label: "Grades", href: "/grades", icon: "grades" });

  // Admin/Instructor navigation
  if (data.permissions.canManageYears || data.permissions.canViewAllLevels) {
    nav.push({ label: "Submissions", href: "/instructor/submissions", icon: "clipboard" });
  }

  // Admin-only navigation
  if (data.permissions.canManageYears) {
    nav.push({ label: "Participants", href: "/admin/participants", icon: "users" });
    nav.push({ label: "Admin Grades", href: "/admin/grades", icon: "admingrades" });
  }

  // Determine current level (for "You" badge)
  const currentLevel = enrolledLevels.find(l => l.key.startsWith("level-"))
    ? parseInt(enrolledLevels.find(l => l.key.startsWith("level-"))!.key.split("-")[1])
    : 1;

  const user: UserInfo = {
    name: data.user.name,
    avatarUrl: data.user.avatarUrl,
    isOnProbation: data.user.isOnProbation ?? false,
  };

  return { nav, cards: [], currentLevel, user };
}

// ─── Stub data (fallback) ─────────────────────────────────────────────────────

export function getDashboardData(cohortStartYear: number = 2025): DashboardData {
  const currentLevel = levelFromYear(cohortStartYear);

  const nav: NavItem[] = [
    { label: "Combine",  href: "/courses/combine",  icon: "grid" },
    { label: "Level 1",  href: "/courses/level-1",  icon: "1" },
    { label: "Level 2",  href: "/courses/level-2",  icon: "2" },
    { label: "Level 3",  href: "/courses/level-3",  icon: "3" },
    { label: "Level 4",  href: "/courses/level-4",  icon: "4" },
    { label: "Calendar",     href: "/calendar",            icon: "calendar" },
    { label: "Grades",       href: "/grades",              icon: "grades"   },
    { label: "Participants", href: "/admin/participants",  icon: "users"    },
    { label: "Admin Grades", href: "/admin/grades",        icon: "admingrades" },
  ];

  const allCards: CourseCard[] = [
    {
      id: "level-1",
      title: "Level 1",
      description: "Foundations of web development — HTML, CSS, and JavaScript fundamentals.",
      level: 1,
      yearLabel: "2025–26",
      href: "/courses/level-1",
      color: "bg-blue-500",
      badge: currentLevel === 1 ? "Current" : currentLevel < 1 ? "Upcoming" : "Completed",
    },
    {
      id: "level-2",
      title: "Level 2",
      description: "React, TypeScript, and modern front-end tooling.",
      level: 2,
      yearLabel: "2026–27",
      href: "/courses/level-2",
      color: "bg-violet-500",
      badge: currentLevel === 2 ? "Current" : currentLevel < 2 ? "Upcoming" : "Completed",
    },
    {
      id: "level-3",
      title: "Level 3",
      description: "Back-end APIs, databases, and cloud deployment.",
      level: 3,
      yearLabel: "2027–28",
      href: "/courses/level-3",
      color: "bg-emerald-500",
      badge: currentLevel === 3 ? "Current" : currentLevel < 3 ? "Upcoming" : "Completed",
    },
    {
      id: "level-4",
      title: "Level 4",
      description: "Capstone projects, system design, and career readiness.",
      level: 4,
      yearLabel: "2028–29",
      href: "/courses/level-4",
      color: "bg-orange-500",
      badge: currentLevel === 4 ? "Current" : currentLevel < 4 ? "Upcoming" : "Completed",
    },
  ];

  // Stub user — replace with JWT decode + DB lookup in production
  const user: UserInfo = {
    name: "Isaiah Ferguson",
    avatarUrl: null,
  };

  return { nav, cards: allCards, currentLevel, user };
}
