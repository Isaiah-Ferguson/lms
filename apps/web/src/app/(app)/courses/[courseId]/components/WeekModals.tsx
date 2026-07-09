"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { LevelWeek } from "./level-dashboard-types";

const TOPICS_PLACEHOLDER = "Controllers & Routes\nServices & Dependency Injection\nRESTful API Design\n...";

function parseTopics(raw: string): string[] {
  return raw.split("\n").map((l) => l.trim()).filter(Boolean);
}

/** The "Topics / Content Covered" textarea shared by the create and edit week modals. */
function TopicsField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="WeekText" className="text-sm font-medium text-gray-700 dark:text-slate-300">
        Topics / Content Covered
        <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-slate-500">one per line (not video titles)</span>
      </label>
      <textarea
        id="WeekText"
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={TOPICS_PLACEHOLDER}
        className="w-full resize-y rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:focus:ring-brand-400/20"
      />
      <p className="text-xs text-gray-500 dark:text-slate-400">Note: Video titles are managed separately in the week details page.</p>
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

export function WeekCreateModal({ defaultWeekNumber, defaultZoomUrl, onClose, onSave, saving = false, saveError = "" }: {
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
    const topics = parseTopics(form.topicsRaw);
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
        <TopicsField
          value={form.topicsRaw}
          onChange={(v) => { setForm((f) => ({ ...f, topicsRaw: v })); setError(""); }}
        />
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

export function WeekEditModal({ week, onClose, onSave }: {
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
    const topics = parseTopics(form.topicsRaw);
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
        <TopicsField
          value={form.topicsRaw}
          onChange={(v) => { setForm((f) => ({ ...f, topicsRaw: v })); setError(""); }}
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm">Save week</Button>
        </div>
      </form>
    </Modal>
  );
}
