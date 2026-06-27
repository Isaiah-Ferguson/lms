"use client";

import { useState } from "react";
import { Megaphone, Calendar, AlertCircle, Info, X, Plus, Pencil, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "./Modal";
import type { LevelAnnouncement } from "./level-dashboard-types";

const TAG_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  DayOff: { bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-700 dark:text-red-400", icon: <X className="h-3 w-3" /> },
  Event: { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-400", icon: <Calendar className="h-3 w-3" /> },
  Reminder: { bg: "bg-yellow-50 dark:bg-yellow-950/40", text: "text-yellow-700 dark:text-yellow-400", icon: <AlertCircle className="h-3 w-3" /> },
  Info: { bg: "bg-gray-100 dark:bg-slate-700", text: "text-gray-600 dark:text-slate-300", icon: <Info className="h-3 w-3" /> },
};

function fmtDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
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
            className="w-full resize-y rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:focus:ring-brand-400/20"
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
              className="h-10 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-sm text-gray-900 dark:text-slate-100 focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:focus:ring-brand-400/20"
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

export function AnnouncementsCard({
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
                          aria-label={`Edit announcement: ${ann.title}`}
                          className="rounded p-1 text-gray-300 dark:text-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        >
                          <Pencil className="h-3 w-3" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleDelete(ann.id)}
                          aria-label={`Delete announcement: ${ann.title}`}
                          className="rounded p-1 text-gray-300 dark:text-slate-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
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
