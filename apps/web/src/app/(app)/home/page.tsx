"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type AcademicYear,
  type CourseLevel,
  type DashboardCurrentUser,
  type DashboardPermissions,
  type EnrollmentsByYear,
} from "@/lib/dashboard-home-data";
import { ApiError, homeApi } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { YearSelector } from "./YearSelector";
import { ManageYearsModal } from "./ManageYearsModal";
import { LevelCardGrid } from "./LevelCardGrid";

// Prevent caching to ensure fresh user data
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryYearId = searchParams.get("year");

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [levels, setLevels] = useState<CourseLevel[]>([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [enrollmentsByYear, setEnrollmentsByYear] = useState<EnrollmentsByYear>({});
  const [currentUser, setCurrentUser] = useState<DashboardCurrentUser | null>(null);
  const [permissions, setPermissions] = useState<DashboardPermissions>({
    canManageYears: false,
    canViewAllLevels: false,
    canViewEnrolledOnly: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isManageYearsOpen, setIsManageYearsOpen] = useState(false);

  async function loadDashboard(opts?: { preserveSelectedYear?: string }) {
    const token = getToken();
    if (!token) {
      setError("Your session expired. Please sign in again.");
      setLoading(false);
      return;
    }

    try {
      const data = await homeApi.getDashboard(token);

      setYears(data.years);
      setLevels(data.levels);
      setEnrollmentsByYear(data.enrollmentsByYear);
      setCurrentUser(data.user);
      setPermissions(data.permissions);

      const preferred = opts?.preserveSelectedYear
        ?? (queryYearId
          ? data.years.find((year) => year.id === queryYearId || year.label === queryYearId)?.id
          : undefined);

      const activeYearId = data.years.find((year) => year.isActive)?.id ?? data.years[0]?.id ?? "";
      setSelectedYearId(preferred ?? activeYearId);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.detail : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryYearId]);

  useEffect(() => {
    const activeYear = years.find((year) => year.isActive) ?? years[0];
    if (!activeYear) {
      return;
    }

    const visibleYears =
      permissions.canViewAllLevels
        ? years
        : years.filter((year) => (enrollmentsByYear[year.id] ?? []).length > 0);

    // For students (canViewEnrolledOnly), automatically select their enrolled year
    // Ignore query params for students - they should only see their cohort
    const resolvedSelected = permissions.canViewAllLevels
      ? (queryYearId && visibleYears.some((year) => year.id === queryYearId)
          ? queryYearId
          : visibleYears.find((year) => year.id === selectedYearId)?.id ?? activeYear.id)
      : (visibleYears[0]?.id ?? activeYear.id); // Students: use first enrolled year

    if (resolvedSelected !== selectedYearId) {
      setSelectedYearId(resolvedSelected);
    }
  }, [years, queryYearId, selectedYearId, enrollmentsByYear, permissions.canViewAllLevels]);

  // Year switching is now handled by Manage Years modal which reloads the page

  const visibleYears = useMemo(
    () =>
      permissions.canViewAllLevels
        ? years
        : years.filter((year) => (enrollmentsByYear[year.id] ?? []).length > 0),
    [permissions.canViewAllLevels, years, enrollmentsByYear]
  );

  // For enrolled students: group levels by year
  const levelsByYear = useMemo(() => {
    if (permissions.canViewAllLevels) {
      // Admins see single year at a time
      return null;
    }

    // Get years with enrollments, sorted newest first
    const enrolledYears = years
      .filter((year) => (enrollmentsByYear[year.id] ?? []).length > 0)
      .sort((a, b) => b.label.localeCompare(a.label)); // Newest first

    const order = ["combine", "level-1", "level-2", "level-3", "level-4"];

    return enrolledYears.map((year) => {
      const yearLevels = levels
        .filter((level) => level.yearId === year.id)
        .sort((a, b) => {
          const indexA = order.indexOf(a.key);
          const indexB = order.indexOf(b.key);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });

      return {
        year,
        levels: yearLevels,
        enrolledLevelIds: enrollmentsByYear[year.id] ?? [],
      };
    });
  }, [levels, years, enrollmentsByYear, permissions.canViewAllLevels]);

  // For admins: single year view
  const levelsForSelectedYear = useMemo(() => {
    const filtered = levels.filter((level) => level.yearId === selectedYearId);
    
    const order = ["combine", "level-1", "level-2", "level-3", "level-4"];
    return filtered.sort((a, b) => {
      const indexA = order.indexOf(a.key);
      const indexB = order.indexOf(b.key);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [levels, selectedYearId]);

  const enrolledLevelIdsForSelectedYear = enrollmentsByYear[selectedYearId] ?? [];
  const selectedYear = years.find((year) => year.id === selectedYearId);

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-500 dark:text-slate-400">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="py-16 text-center text-sm text-red-600 dark:text-red-400">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Modern header with gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-sky-500 p-8 shadow-soft z-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Welcome back!</h1>
            <p className="text-brand-50/90 max-w-xl">
              {permissions.canManageYears
                ? "Manage all courses and academic years from your dashboard."
                : permissions.canViewAllLevels
                ? "View and interact with all courses across different academic years."
                : "Continue your learning journey. Your enrolled courses are organized by year below."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {permissions.canViewAllLevels && !permissions.canManageYears && (
              <YearSelector
                years={visibleYears}
                selectedYearId={selectedYearId}
                onChange={(yearId) => {
                  setSelectedYearId(yearId);
                  router.push(`${pathname}?year=${yearId}`);
                }}
              />
            )}
            {permissions.canManageYears && (
              <button
                type="button"
                onClick={() => setIsManageYearsOpen(true)}
                className="rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2.5 text-sm font-semibold text-white border border-white/30 transition hover:bg-white/30 hover:scale-105"
              >
                Manage Years
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enrolled students: show levels grouped by year */}
      {!permissions.canViewAllLevels && levelsByYear ? (
        <div className="space-y-12">
          {levelsByYear.map(({ year, levels: yearLevels, enrolledLevelIds }) => (
            <section key={year.id}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{year.label}</h2>
                {year.isActive && (
                  <span className="inline-flex items-center rounded-full bg-brand-100 dark:bg-brand-900/30 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400">
                    Current Year
                  </span>
                )}
              </div>
              <LevelCardGrid
                levels={yearLevels}
                enrolledLevelIds={enrolledLevelIds}
                canViewAllLevels={false}
                yearLabel={year.label}
              />
            </section>
          ))}
        </div>
      ) : (
        /* Admins: show single year view */
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-100">
            All levels · {selectedYear?.label ?? ""}
          </h2>
          <LevelCardGrid
            levels={levelsForSelectedYear}
            enrolledLevelIds={enrolledLevelIdsForSelectedYear}
            canViewAllLevels={permissions.canViewAllLevels}
            yearLabel={selectedYear?.label ?? "Academic Year"}
          />
        </section>
      )}

      {permissions.canManageYears && (
        <ManageYearsModal
          isOpen={isManageYearsOpen}
          years={years}
          selectedYearId={selectedYearId}
          onClose={() => setIsManageYearsOpen(false)}
          onViewYear={(yearId) => {
            setSelectedYearId(yearId);
            setIsManageYearsOpen(false);
          }}
          onYearActivated={(yearId) => {
            // Reload page to update server-side navigation with new active year
            window.location.href = `/home?year=${yearId}`;
          }}
          onYearCreated={(year) => {
            // Reload page to update server-side navigation with new year
            window.location.href = `/home?year=${year.id}`;
          }}
        />
      )}
    </div>
  );
}
