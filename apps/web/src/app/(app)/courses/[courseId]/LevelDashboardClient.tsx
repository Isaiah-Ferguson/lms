"use client";

import { useState, useEffect } from "react";
import { assignmentsApi, lessonsApi, type AssignmentListItem } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import Link from "next/link";
import {
  Video, Megaphone, Calendar, AlertCircle, Info, X,
  Plus, Pencil, ChevronRight, ExternalLink, Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { AssignmentManager } from "@/components/assignments/AssignmentManager";
import { CreateAssignmentModal } from "./components/CreateAssignmentModal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// ─── Shared types (used by both Level 1 and Level 2) ─────────────────────────

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
  accentColor: string;       // tailwind bg class e.g. "bg-blue-500"
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TAG_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  DayOff: { bg: "bg-red-50", text: "text-red-700", icon: <X className="h-3 w-3" /> },
  Event: { bg: "bg-blue-50", text: "text-blue-700", icon: <Calendar className="h-3 w-3" /> },
  Reminder: { bg: "bg-yellow-50", text: "text-yellow-700", icon: <AlertCircle className="h-3 w-3" /> },
  Info: { bg: "bg-gray-50", text: "text-gray-500", icon: <Info className="h-3 w-3" /> },
};

function fmtDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Modal primitive ──────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}
    >
      <div className={clsx(
        "w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl",
        wide ? "max-w-lg" : "max-w-md"
      )}>
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Announcement edit modal ─────────────────────────────────────────────────

type AnnTag = LevelAnnouncement["tag"];

interface AnnForm { title: string; body: string; date: string; tag: AnnTag; }

function AnnouncementEditModal({ initial, onClose, onSave, saving = false, saveError = "" }: {
  initial?: LevelAnnouncement;
  onClose: () => void;
  onSave: (a: LevelAnnouncement) => void;
  saving?: boolean;
  saveError?: string;
}) {
  const [form, setForm] = useState<AnnForm>({
    title: initial?.title ?? "",
    body: initial?.body ?? "",
    date: initial?.date ? initial.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    tag: initial?.tag ?? "Info",
  });
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (!form.body.trim()) { setError("Body is required"); return; }
    if (!form.date) { setError("Date is required"); return; }
    if (isNaN(new Date(form.date + "T00:00:00").getTime())) { setError("Invalid date"); return; }
    onSave({
      id: initial?.id ?? `ann-${Date.now()}`,
      title: form.title.trim(),
      body: form.body.trim(),
      date: form.date,
      tag: form.tag,
    });
  }

  return (
    <Modal title={initial ? "Edit announcement" : "New announcement"} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          placeholder="e.g. No class Monday"
          value={form.title}
          onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setError(""); }}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Body</label>
          <textarea
            rows={3}
            value={form.body}
            onChange={(e) => { setForm((f) => ({ ...f, body: e.target.value })); setError(""); }}
            placeholder="Announcement details…"
            className="w-full resize-y rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Tag</label>
            <select
              value={form.tag ?? "Info"}
              onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value as AnnTag }))}
              className="h-10 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
            >
              <option value="Info">Info</option>
              <option value="Event">Event</option>
              <option value="Reminder">Reminder</option>
              <option value="DayOff">Day Off</option>
            </select>
          </div>
        </div>
        {(error || saveError) && <p className="text-xs text-red-600">{error || saveError}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" size="sm" loading={saving}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Announcements card ───────────────────────────────────────────────────────

type AnnModalState =
  | { mode: "create" }
  | { mode: "edit"; ann: LevelAnnouncement }
  | null;

function AnnouncementsCard({
  initialAnnouncements,
  canEdit,
  onCreate,
  onUpdate,
  onDelete,
}: {
  initialAnnouncements: LevelAnnouncement[];
  canEdit: boolean;
  onCreate?: (ann: LevelAnnouncement) => Promise<LevelAnnouncement>;
  onUpdate?: (ann: LevelAnnouncement) => Promise<LevelAnnouncement>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [modal, setModal] = useState<AnnModalState>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleSave(ann: LevelAnnouncement) {
    setSaving(true);
    setSaveError("");
    try {
      if (modal?.mode === "create") {
        const created = onCreate ? await onCreate(ann) : ann;
        setAnnouncements((prev) => [created, ...prev]);
      } else {
        const updated = onUpdate ? await onUpdate(ann) : ann;
        setAnnouncements((prev) => prev.map((a) => a.id === updated.id ? updated : a));
      }
      setModal(null);
    } catch {
      setSaveError("Unable to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      if (onDelete) await onDelete(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // silently ignore — row stays visible
    }
  }

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 shrink-0 text-gray-500 dark:text-slate-400" />
            <h3 className="text-xl font-semibold text-gray-800 dark:text-slate-100">Announcements</h3>
          </div>
          {canEdit && (
            <button
              onClick={() => setModal({ mode: "create" })}
              title="Add announcement"
              className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          )}
        </div>
        <ul className="flex-1 divide-y divide-gray-100 dark:divide-slate-700 overflow-y-auto">
          {announcements.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-gray-600 dark:text-slate-400">No announcements yet.</li>
          )}
          {announcements.map((ann) => {
            const tag = ann.tag ? TAG_STYLES[ann.tag] : TAG_STYLES.Info;
            return (
              <li key={ann.id} className="group px-4 py-3">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <span className="text-md font-semibold leading-snug text-gray-800 dark:text-slate-100">{ann.title}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    {ann.tag && (
                      <span className={clsx(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        tag.bg, tag.text
                      )}>
                        {tag.icon}
                        {ann.tag === "DayOff" ? "Day off" : ann.tag}
                      </span>
                    )}
                    {canEdit && (
                      <>
                        <button
                          onClick={() => setModal({ mode: "edit", ann })}
                          title="Edit"
                          className="rounded p-0.5 text-gray-300 dark:text-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-300"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(ann.id)}
                          title="Delete"
                          className="rounded p-0.5 text-gray-300 dark:text-slate-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-300">{ann.body}</p>
                <p className="mt-1 text-[12px] text-gray-500 dark:text-slate-400">{fmtDate(ann.date)}</p>
              </li>
            );
          })}
        </ul>
      </div>

      {modal && (
        <AnnouncementEditModal
          initial={modal.mode === "edit" ? modal.ann : undefined}
          onClose={() => { setModal(null); setSaveError(""); }}
          onSave={(ann) => void handleSave(ann)}
          saving={saving}
          saveError={saveError}
        />
      )}
    </>
  );
}

// ─── Class link card ──────────────────────────────────────────────────────────

function ClassLinkCard({ zoomUrl }: { zoomUrl: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 overflow-hidden rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6 shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-md">
        <Video className="h-7 w-7 text-white" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Live Class</p>
        <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">Join via Zoom</p>
      </div>
      <a
        href={zoomUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Join class
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

// ─── Week create modal ────────────────────────────────────────────────────

interface WeekCreateForm {
  weekNumber: number;
  title: string;
  dateRange: string;
  zoomUrl: string;
  topicsRaw: string; // newline-separated
}

function WeekCreateModal({ defaultWeekNumber, defaultZoomUrl, onClose, onSave, saving = false, saveError = "" }: {
  defaultWeekNumber: number;
  defaultZoomUrl: string;
  onClose: () => void;
  onSave: (week: Omit<LevelWeek, "id" | "detailsHref">) => void;
  saving?: boolean;
  saveError?: string;
}) {
  const [form, setForm] = useState<WeekCreateForm>({
    weekNumber: defaultWeekNumber,
    title: "",
    dateRange: "",
    zoomUrl: defaultZoomUrl,
    topicsRaw: "",
  });
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (!form.dateRange.trim()) { setError("Date range is required"); return; }
    const topics = form.topicsRaw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (topics.length === 0) { setError("Add at least one topic"); return; }

    onSave({
      weekNumber: form.weekNumber,
      title: form.title.trim(),
      dateRange: form.dateRange.trim(),
      zoomUrl: form.zoomUrl.trim(),
      topics,
    });
  }

  return (
    <Modal title="Create New Week" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="Week number"
            type="number"
            min="1"
            value={form.weekNumber}
            onChange={(e) => { setForm((f) => ({ ...f, weekNumber: parseInt(e.target.value) || 1 })); setError(""); }}
            disabled
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Weeks must be created sequentially. This is the next available week number.</p>
        </div>
        <Input
          label="Week title"
          placeholder="e.g. API Foundations"
          value={form.title}
          onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setError(""); }}
        />
        <Input
          label="Date range"
          placeholder="e.g. Jan 5 – Jan 9"
          value={form.dateRange}
          onChange={(e) => { setForm((f) => ({ ...f, dateRange: e.target.value })); setError(""); }}
        />
        <Input
          label="Zoom URL"
          placeholder="https://zoom.us/..."
          value={form.zoomUrl}
          onChange={(e) => { setForm((f) => ({ ...f, zoomUrl: e.target.value })); setError(""); }}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
            Topics / Content Covered
            <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-slate-500">one per line (not video titles)</span>
          </label>
          <textarea
            rows={6}
            value={form.topicsRaw}
            onChange={(e) => { setForm((f) => ({ ...f, topicsRaw: e.target.value })); setError(""); }}
            placeholder={"Controllers & Routes\nServices & Dependency Injection\nRESTful API Design\n..."}
            className="w-full resize-y rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
          />
          <p className="text-xs text-gray-500 dark:text-slate-400">Note: Video titles are managed separately in the week details page.</p>
        </div>
        {(error || saveError) && <p className="text-xs text-red-600">{error || saveError}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" size="sm" loading={saving}>Create week</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Week edit modal ──────────────────────────────────────────────────────

interface WeekEditForm {
  title: string;
  dateRange: string;
  topicsRaw: string; // newline-separated
}

function WeekEditModal({ week, onClose, onSave }: {
  week: LevelWeek;
  onClose: () => void;
  onSave: (updated: LevelWeek) => void;
}) {
  const [form, setForm] = useState<WeekEditForm>({
    title: week.title,
    dateRange: week.dateRange,
    topicsRaw: week.topics.join("\n"),
  });
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (!form.dateRange.trim()) { setError("Date range is required"); return; }
    const topics = form.topicsRaw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (topics.length === 0) { setError("Add at least one topic"); return; }
    onSave({ ...week, title: form.title.trim(), dateRange: form.dateRange.trim(), topics });
  }

  return (
    <Modal title={`Edit Week ${week.weekNumber}`} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Week title"
          placeholder="e.g. API Foundations"
          value={form.title}
          onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setError(""); }}
        />
        <Input
          label="Date range"
          placeholder="e.g. Jan 5 – Jan 9"
          value={form.dateRange}
          onChange={(e) => { setForm((f) => ({ ...f, dateRange: e.target.value })); setError(""); }}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="WeekText" className="text-sm font-medium text-gray-700 dark:text-slate-300">
            Topics / Content Covered
            <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-slate-500">one per line (not video titles)</span>
          </label>
          <textarea
            id="WeekText"
            rows={6}
            value={form.topicsRaw}
            onChange={(e) => { setForm((f) => ({ ...f, topicsRaw: e.target.value })); setError(""); }}
            placeholder={"Controllers & Routes\nServices & Dependency Injection\nRESTful API Design\n..."}
            className="w-full resize-y rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
          />
          <p className="text-xs text-gray-500 dark:text-slate-400">Note: Video titles are managed separately in the week details page.</p>
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm">Save week</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Week card ────────────────────────────────────────────────────────────────

function WeekCard({ week, canEdit, onEdit }: {
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
                title="Edit week"
                className="rounded p-1 text-gray-300 dark:text-slate-600 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              >
                <Pencil className="h-3 w-3" />
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
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
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
            {videos.map((video, i) => (
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

// ─── Assignment form ──────────────────────────────────────────────────────────

interface AssignmentFormData { title: string; type: AssignmentType; weekNumber: string; }

function AssignmentForm({ initial, onSave, onCancel, saving }: {
  initial?: Partial<AssignmentFormData>;
  onSave: (d: AssignmentFormData) => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [form, setForm] = useState<AssignmentFormData>({
    title: initial?.title ?? "",
    type: initial?.type ?? "MiniChallenge",
    weekNumber: initial?.weekNumber ?? "",
  });
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    onSave(form);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        label="Title"
        placeholder="e.g. Build a landing page"
        value={form.title}
        onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setError(""); }}
        error={error}
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Type</label>
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AssignmentType }))}
          className="h-10 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
        >
          <option value="MiniChallenge">Mini Challenge</option>
          <option value="Challenge">Challenge</option>
          <option value="Project">Project</option>
        </select>
      </div>
      <Input
        label="Week number (optional)"
        type="number" min={1} max={20}
        placeholder="e.g. 3"
        value={form.weekNumber}
        onChange={(e) => setForm((f) => ({ ...f, weekNumber: e.target.value }))}
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

// ─── Assignments section ──────────────────────────────────────────────────────

const COL_META: {
  key: keyof LevelData["assignments"];
  label: string;
  accent: string;
  badge: string;
}[] = [
    { key: "miniChallenges", label: "Mini Challenges", accent: "bg-violet-500", badge: "bg-violet-100 text-violet-700" },
    { key: "challenges", label: "Challenges", accent: "bg-blue-500", badge: "bg-blue-100 text-blue-700" },
    { key: "projects", label: "Projects", accent: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  ];

function AssignmentsSection({
  courseId,
  canEdit,
  onCreateClick,
}: {
  courseId: string;
  weeks: LevelWeek[];
  canEdit: boolean;
  onCreateClick?: () => void;
}) {
  const [assignments, setAssignments] = useState<LevelData["assignments"]>({ miniChallenges: [], challenges: [], projects: [] });

  useEffect(() => {
    const token = getToken();
    if (!token || !courseId) return;
    assignmentsApi.getAssignmentsByCourse(courseId, token)
      .then((items: AssignmentListItem[]) => {
        const result: LevelData["assignments"] = { miniChallenges: [], challenges: [], projects: [] };
        for (const a of items) {
          const key =
            a.assignmentType === "MiniChallenge" ? "miniChallenges" :
              a.assignmentType === "Project" ? "projects" :
                "challenges";
          result[key].push({
            id: a.id,
            title: a.title,
            type: a.assignmentType as LevelAssignment["type"],
            weekNumber: undefined,
            href: `/courses/${courseId}/assignments/${a.id}`,
          });
        }
        setAssignments(result);
      })
      .catch(() => { });
  }, [courseId]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[30px] font-bold text-gray-900 dark:text-slate-100">Assignments</h2>
        {canEdit && onCreateClick && (
          <button
            onClick={onCreateClick}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Assignment
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {COL_META.map(({ key, label, accent, badge }) => (
          <div key={key} className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <div className={clsx("h-1 w-full", accent)} />
            <div className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 px-4 py-2.5">
              <h3 className="text-lg font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</h3>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-slate-700">
              {assignments[key].length === 0 && (
                <li className="px-4 py-4 text-center text-xs text-gray-700 dark:text-slate-400">No assignments yet.</li>
              )}
              {assignments[key].map((a) => (
                <li
                  key={a.id ?? a.title}
                  className="px-4 py-2.5"
                >
                  <Link
                    href={a.href}
                    className="group flex items-center justify-between rounded-md px-3 py-2 text-md font-medium 
             bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 transition-all duration-150 
             hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-800 dark:hover:text-blue-300 active:bg-blue-200 dark:active:bg-blue-900/50"
                  >
                    <span className="flex items-center gap-2">
                      {a.title}

                      {a.weekNumber && (
                        <span
                          className={clsx(
                            "ml-1.5 rounded-full px-1.5 py-0.5 text-[13px] font-semibold bg-blue-200 text-blue-800",
                            badge
                          )}
                        >
                          W{a.weekNumber}
                        </span>
                      )}
                    </span>

                    {/* arrow */}
                    <span className="opacity-0 translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

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
        <div className={clsx("h-2 w-full", data.accentColor)} />
        <div className="px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 dark:text-slate-400">
            CodeStack Academy
          </p>
          <h1 className="mt-0.5 text-3xl font-bold text-gray-900 dark:text-slate-100">{data.courseTitle}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{data.courseMeta}</p>
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
        weeks={weeks}
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
