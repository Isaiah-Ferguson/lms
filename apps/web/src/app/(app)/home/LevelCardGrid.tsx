"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { motion, useReducedMotion } from "framer-motion";
import type { CourseLevel } from "@/lib/dashboard-home-data";

interface LevelCardGridProps {
  levels: CourseLevel[];
  enrolledLevelIds: string[];
  canViewAllLevels: boolean;
  yearLabel: string;
}

const ACCENT_BY_LEVEL_KEY: Record<string, { gradient: string; glow: string; label: string }> = {
  combine: { 
    gradient: "from-slate-600 via-slate-500 to-slate-600",
    glow: "group-hover:shadow-[0_0_30px_rgba(100,116,139,0.4)]",
    label: "C"
  },
  "level-1": { 
    gradient: "from-brand-600 via-brand-500 to-sky-500",
    glow: "group-hover:shadow-[0_0_30px_rgba(14,165,233,0.5)]",
    label: "1"
  },
  "level-2": { 
    gradient: "from-violet-600 via-violet-500 to-purple-500",
    glow: "group-hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]",
    label: "2"
  },
  "level-3": { 
    gradient: "from-emerald-600 via-emerald-500 to-teal-500",
    glow: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]",
    label: "3"
  },
  "level-4": { 
    gradient: "from-orange-600 via-orange-500 to-amber-500",
    glow: "group-hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]",
    label: "4"
  },
};

export function LevelCardGrid({
  levels,
  enrolledLevelIds,
  canViewAllLevels,
  yearLabel,
}: LevelCardGridProps) {
  const reduceMotion = useReducedMotion();
  const visibleLevels = canViewAllLevels
    ? levels
    : levels.filter((level) => enrolledLevelIds.includes(level.id));

  if (visibleLevels.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-10 text-center text-sm text-gray-500 dark:text-slate-400">
        No enrolled levels found for {yearLabel}.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {visibleLevels.map((level, index) => {
        const accent = ACCENT_BY_LEVEL_KEY[level.key] ?? { 
          gradient: "from-gray-600 via-gray-500 to-gray-600",
          glow: "group-hover:shadow-[0_0_30px_rgba(107,114,128,0.4)]",
          label: "?"
        };
        const isEnrolled = enrolledLevelIds.includes(level.id);

        return (
          <motion.div
            key={level.id}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: index * 0.06 }}
          >
            <Link
              href={`/courses/${level.id}`}
              className={clsx(
                "group relative flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-soft transition-all duration-300",
                "hover:shadow-xl hover:-translate-y-1 dark:border dark:border-slate-700",
                accent.glow,
                level.isArchived && "opacity-80"
              )}
            >
              {/* Gradient header */}
              <div className={clsx(
                "h-36 w-full bg-gradient-to-br relative overflow-hidden",
                accent.gradient
              )}>
                <div className="absolute inset-0 bg-black/10" />
                <span
                  aria-hidden="true"
                  className="mx-3 text-[7rem] font-black leading-none text-white/10 select-none pointer-events-none"
                >
                  {accent.label}
                </span>
                <div className="absolute top-3 right-3">
                  <span className={clsx(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm",
                    isEnrolled 
                      ? "bg-white/20 text-white border border-white/30" 
                      : "bg-white/10 text-white/80 border border-white/20"
                  )}>
                    {isEnrolled && <Sparkles className="h-3 w-3" />}
                    {canViewAllLevels ? (isEnrolled ? "Enrolled" : "Available") : "Enrolled"}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-3 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">{yearLabel}</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {level.title}
                  </h2>
                </div>
                <p className="flex-1 text-sm leading-relaxed text-gray-600 dark:text-slate-400">{level.description}</p>
                
                {/* CTA */}
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-800 dark:text-brand-400 transition-all group-hover:gap-3">
                  <span>Explore course</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>

              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
