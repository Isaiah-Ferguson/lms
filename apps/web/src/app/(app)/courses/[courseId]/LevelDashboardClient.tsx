"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Plus } from "lucide-react";
import { CreateAssignmentModal } from "./components/CreateAssignmentModal";
import { AnnouncementsCard } from "./components/AnnouncementsCard";
import { ClassLinkCard } from "./components/ClassLinkCard";
import { WeekCard } from "./components/WeekCard";
import { WeekCreateModal, WeekEditModal } from "./components/WeekModals";
import { AssignmentsSection } from "./components/AssignmentsSection";
import type {
  LevelData,
  LevelWeek,
  LevelAnnouncement,
} from "./components/level-dashboard-types";

interface LevelDashboardProps {
  data: LevelData;
  onWeekSave?: (week: LevelWeek) => Promise<LevelWeek>;
  onAnnouncementCreate?: (ann: LevelAnnouncement) => Promise<LevelAnnouncement>;
  onAnnouncementUpdate?: (ann: LevelAnnouncement) => Promise<LevelAnnouncement>;
  onAnnouncementDelete?: (id: string) => Promise<void>;
}

export function LevelDashboardClient({
  data,
  onWeekSave,
  onWeekCreate,
  onAnnouncementCreate,
  onAnnouncementUpdate,
  onAnnouncementDelete,
}: LevelDashboardProps & { onWeekCreate?: (week: Omit<LevelWeek, "id" | "detailsHref">) => Promise<LevelWeek> }) {
  const [weeks, setWeeks] = useState<LevelWeek[]>(data.weeks);
  const [editingWeek, setEditingWeek] = useState<LevelWeek | null>(null);
  const [creatingWeek, setCreatingWeek] = useState(false);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleWeekSave(updated: LevelWeek) {
    try {
      const saved = onWeekSave ? await onWeekSave(updated) : updated;
      setWeeks((prev) => prev.map((w) => w.weekNumber === saved.weekNumber ? saved : w));
    } catch {
      // keep modal open on error so user sees it
      return;
    }
    setEditingWeek(null);
  }

  async function handleWeekCreate(week: Omit<LevelWeek, "id" | "detailsHref">) {
    setSaving(true);
    setSaveError("");
    try {
      const created = onWeekCreate ? await onWeekCreate(week) : { ...week, id: `week-${Date.now()}`, detailsHref: `/courses/${data.courseId}/weeks/${week.weekNumber}` };
      setWeeks((prev) => [...prev, created].sort((a, b) => a.weekNumber - b.weekNumber));
      setCreatingWeek(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to create week");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">

      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <div className={clsx("h-2 w-full bg-gradient-to-r", data.gradient)} />
        <div className="px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 dark:text-slate-400">
            CodeStack Academy
          </p>
          <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100">{data.courseTitle}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{data.description}</p>
        </div>
      </div>

      {/* ── Week grid ──────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-600">
            Weekly schedule
          </h2>
          {data.permissions.canEditAssignments && (
            <button
              onClick={() => setCreatingWeek(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Week
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Pinned row 1: announcements + zoom */}
          <AnnouncementsCard
            initialAnnouncements={data.announcements}
            canEdit={data.permissions.canEditAssignments}
            onCreate={onAnnouncementCreate}
            onUpdate={onAnnouncementUpdate}
            onDelete={onAnnouncementDelete}
          />
          <ClassLinkCard zoomUrl={data.zoomUrl} />

          {/* Week cards */}
          {weeks.map((week) => (
            <WeekCard
              key={week.weekNumber}
              week={week}
              canEdit={data.permissions.canEditAssignments}
              onEdit={setEditingWeek}
            />
          ))}
        </div>
      </section>

      {/* ── Assignments ────────────────────────────────────────────────────── */}
      <AssignmentsSection
        courseId={data.courseId}
        canEdit={data.permissions.canEditAssignments}
        onCreateClick={() => setCreatingAssignment(true)}
      />

      {/* ── Week create modal ───────────────────────────────────────────────── */}
      {creatingWeek && (
        <WeekCreateModal
          defaultWeekNumber={weeks.length > 0 ? Math.max(...weeks.map(w => w.weekNumber)) + 1 : 1}
          defaultZoomUrl={data.zoomUrl}
          onClose={() => { setCreatingWeek(false); setSaveError(""); }}
          onSave={(week) => void handleWeekCreate(week)}
          saving={saving}
          saveError={saveError}
        />
      )}

      {/* ── Week edit modal ─────────────────────────────────────────────────── */}
      {editingWeek && (
        <WeekEditModal
          week={editingWeek}
          onClose={() => setEditingWeek(null)}
          onSave={(updated) => void handleWeekSave(updated)}
        />
      )}

      {/* ── Create Assignment modal ─────────────────────────────────────────── */}
      {creatingAssignment && (
        <CreateAssignmentModal
          isOpen={creatingAssignment}
          courseId={data.courseId}
          weeks={weeks}
          onClose={() => setCreatingAssignment(false)}
          onCreated={() => {
            setCreatingAssignment(false);
            // Trigger a refresh by updating a dummy state or reloading assignments
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
