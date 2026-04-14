"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Video, Megaphone, Calendar, AlertCircle, Info, X,
  Plus, Pencil, ChevronRight, ExternalLink, BookOpen,
} from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type {
  Level1Data, Level1Week, Level1Announcement,
  Level1Assignment, AssignmentType,
} from "@/lib/level1-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TAG_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  DayOff:   { bg: "bg-red-50",    text: "text-red-700",    icon: <X className="h-3 w-3" /> },
  Event:    { bg: "bg-blue-50",   text: "text-blue-700",   icon: <Calendar className="h-3 w-3" /> },
  Reminder: { bg: "bg-yellow-50", text: "text-yellow-700", icon: <AlertCircle className="h-3 w-3" /> },
  Info:     { bg: "bg-gray-50",   text: "text-gray-500",   icon: <Info className="h-3 w-3" /> },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Announcements card (pinned, spans first grid slot) ───────────────────────

function AnnouncementsCard({ announcements }: { announcements: Level1Announcement[] }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <Megaphone className="h-4 w-4 shrink-0 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-800">Announcements</h3>
      </div>
      <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto">
        {announcements.map((ann) => {
          const tag = ann.tag ? TAG_STYLES[ann.tag] : TAG_STYLES.Info;
          return (
            <li key={ann.id} className="px-4 py-3">
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-gray-800 leading-snug">{ann.title}</span>
                {ann.tag && (
                  <span className={clsx(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    tag.bg, tag.text
                  )}>
                    {tag.icon}
                    {ann.tag === "DayOff" ? "Day off" : ann.tag}
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-gray-700">{ann.body}</p>
              <p className="mt-1 text-[12px] text-gray-600">{fmtDate(ann.date)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Zoom / Class link card (pinned, second grid slot) ────────────────────────

function ClassLinkCard({ zoomUrl }: { zoomUrl: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 overflow-hidden rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-md">
        <Video className="h-7 w-7 text-white" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-blue-900">Live Class</p>
        <p className="mt-0.5 text-xs text-blue-600">Join via Zoom</p>
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

// ─── Week card ────────────────────────────────────────────────────────────────

function WeekCard({ week }: { week: Level1Week }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Week {week.weekNumber}</h3>
          <span className="text-[11px] font-medium text-gray-400">{week.dateRange}</span>
        </div>
      </div>

      {/* Topics */}
      <div className="flex-1 px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          What we&apos;re covering
        </p>
        <ul className="space-y-1.5">
          {week.topics.map((topic, i) => (
            <li key={i} className="flex items-center gap-2 text-ml text-gray-700">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              {topic.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
        <a
          href={week.zoomUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <Video className="h-3 w-3" />
          Class link
        </a>
        <Link
          href={week.detailsHref}
          className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          View Details
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Assignment form ──────────────────────────────────────────────────────────

interface AssignmentFormData { title: string; type: AssignmentType; weekNumber: string; }

function AssignmentForm({ initial, onSave, onCancel }: {
  initial?: Partial<AssignmentFormData>;
  onSave: (d: AssignmentFormData) => void;
  onCancel: () => void;
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
        <label className="text-sm font-medium text-gray-700">Type</label>
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AssignmentType }))}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="MiniChallenge">Mini Challenge</option>
          <option value="Challenge">Challenge</option>
          <option value="Project">Project</option>
        </select>
      </div>
      <Input
        label="Week number (optional)"
        type="number" min={1} max={10}
        placeholder="e.g. 3"
        value={form.weekNumber}
        onChange={(e) => setForm((f) => ({ ...f, weekNumber: e.target.value }))}
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm">Save</Button>
      </div>
    </form>
  );
}

// ─── Assignments section ──────────────────────────────────────────────────────

type ModalState = { mode: "create" } | { mode: "edit"; assignment: Level1Assignment } | null;

const COL_META: {
  key: keyof Level1Data["assignments"];
  label: string;
  accent: string;
  badge: string;
}[] = [
  { key: "miniChallenges", label: "Mini Challenges", accent: "bg-violet-500", badge: "bg-violet-100 text-violet-700" },
  { key: "challenges",     label: "Challenges",      accent: "bg-blue-500",   badge: "bg-blue-100 text-blue-700"     },
  { key: "projects",       label: "Projects",        accent: "bg-emerald-500",badge: "bg-emerald-100 text-emerald-700" },
];

function AssignmentsSection({
  initialAssignments,
  canEdit,
}: {
  initialAssignments: Level1Data["assignments"];
  canEdit: boolean;
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [modal, setModal] = useState<ModalState>(null);

  function handleSave(data: AssignmentFormData) {
    if (modal?.mode === "create") {
      const item: Level1Assignment = {
        id: `new-${Date.now()}`,
        title: data.title,
        type: data.type,
        weekNumber: data.weekNumber ? parseInt(data.weekNumber) : undefined,
        href: "#",
      };
      const key =
        data.type === "MiniChallenge" ? "miniChallenges" :
        data.type === "Challenge"     ? "challenges"     : "projects";
      setAssignments((prev) => ({ ...prev, [key]: [...prev[key], item] }));
    } else if (modal?.mode === "edit") {
      const id = modal.assignment.id;
      const update = (arr: Level1Assignment[]) =>
        arr.map((a) => a.id === id
          ? { ...a, title: data.title, type: data.type,
              weekNumber: data.weekNumber ? parseInt(data.weekNumber) : undefined }
          : a);
      setAssignments((prev) => ({
        miniChallenges: update(prev.miniChallenges),
        challenges:     update(prev.challenges),
        projects:       update(prev.projects),
      }));
    }
    setModal(null);
  }

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Assignments</h2>
          <p className="text-xs text-gray-400">Mini Challenges · Challenges · Projects</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setModal({ mode: "create" })}>
            <Plus className="h-3.5 w-3.5" />
            New assignment
          </Button>
        )}
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {COL_META.map(({ key, label, accent, badge }) => (
          <div key={key} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className={clsx("h-1 w-full", accent)} />
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</h3>
            </div>
            <ul className="divide-y divide-gray-100">
              {assignments[key].length === 0 && (
                <li className="px-4 py-4 text-center text-xs text-gray-400">No assignments yet.</li>
              )}
              {assignments[key].map((a) => (
                <li key={a.id} className="flex items-center gap-2 px-4 py-2.5">
                  <Link
                    href={a.href}
                    className="flex-1 text-sm text-gray-700 hover:text-blue-600 hover:underline"
                  >
                    {a.title}
                    {a.weekNumber && (
                      <span className={clsx(
                        "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        badge
                      )}>
                        W{a.weekNumber}
                      </span>
                    )}
                  </Link>
                  {canEdit && (
                    <button
                      onClick={() => setModal({ mode: "edit", assignment: a })}
                      className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {modal && (
        <Modal
          title={modal.mode === "create" ? "Create assignment" : "Edit assignment"}
          onClose={() => setModal(null)}
        >
          <AssignmentForm
            initial={modal.mode === "edit" ? {
              title: modal.assignment.title,
              type: modal.assignment.type,
              weekNumber: modal.assignment.weekNumber?.toString(),
            } : undefined}
            onSave={handleSave}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </section>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function Level1DashboardClient({ data }: { data: Level1Data }) {
  return (
    <div className="mx-auto max-w-6xl space-y-10">

      {/* ── Page heading ───────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="h-2 w-full bg-blue-500" />
        <div className="px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-800">
            CodeStack Academy
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-gray-900">Level 1 — Web Foundations</h1>
          <p className="mt-1 text-sm text-gray-500">
            10-week programme · Oct 14 – Dec 27
          </p>
        </div>
      </div>

      {/* ── Week grid ──────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-300">
          Weekly schedule
        </h2>

        {/*
          2-column grid.
          Row 1: Announcements card (col 1) + Zoom/class link card (col 2).
          Rows 2–6: Week cards, 2 per row (weeks 1–10).
        */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Pinned row 1 */}
          <AnnouncementsCard announcements={data.announcements} />
          <ClassLinkCard zoomUrl={data.zoomUrl} />

          {/* Week cards — 2 per row */}
          {data.weeks.map((week) => (
            <WeekCard key={week.weekNumber} week={week} />
          ))}
        </div>
      </section>

      {/* ── Assignments ────────────────────────────────────────────────────── */}
      <AssignmentsSection
        initialAssignments={data.assignments}
        canEdit={data.permissions.canEditAssignments}
      />
    </div>
  );
}
