"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Video, Pencil, ChevronRight } from "lucide-react";
import { lessonsApi } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import type { LevelWeek } from "./level-dashboard-types";

export function WeekCard({ week, canEdit, onEdit }: {
  week: LevelWeek;
  canEdit: boolean;
  onEdit: (w: LevelWeek) => void;
}) {
  const [videos, setVideos] = useState<Array<{ id: string; title: string }>>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token || !week.id) {
      setLoadingVideos(false);
      return;
    }

    lessonsApi.getModuleLessons(week.id, token)
      .then((lessons) => {
        setVideos(lessons.map(l => ({ id: l.id, title: l.title })));
        setLoadingVideos(false);
      })
      .catch(() => {
        setLoadingVideos(false);
      });
  }, [week.id]);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 truncate">
              Week {week.weekNumber}
              {week.title && (
                <span className="ml-1.5 font-medium text-gray-500 dark:text-slate-400">— {week.title}</span>
              )}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-[11px] font-medium text-gray-600 dark:text-slate-400">{week.dateRange}</span>
            {canEdit && (
              <button
                onClick={() => onEdit(week)}
                aria-label={`Edit week ${week.weekNumber}`}
                className="rounded p-1 text-gray-300 dark:text-slate-600 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Pencil className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Topics / Content Covered */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-gray-500 dark:text-slate-400">
          Topics / Content Covered
        </p>
        <ul className="space-y-1.5">
          {week.topics.map((topic, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
              {topic}
            </li>
          ))}
        </ul>
      </div>

      {/* Videos */}
      <div className="flex-1 px-4 py-3">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-gray-500 dark:text-slate-400">
          Videos
        </p>
        {loadingVideos ? (
          <p className="text-sm text-gray-400 dark:text-slate-500">Loading videos...</p>
        ) : videos.length > 0 ? (
          <ul className="space-y-1.5">
            {videos.map((video) => (
              <li key={video.id} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                {video.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500 dark:text-slate-400">No videos yet</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 px-4 py-2.5">
        <a
          href={week.zoomUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          <Video className="h-3 w-3" />
          Class link
        </a>
        <Link
          href={week.detailsHref}
          className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          View Details
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
