"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Video, FileText, ExternalLink, Megaphone, Calendar,
  Plus, Pencil, X, ChevronRight, AlertCircle, Info,
} from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type {
  Week, Announcement, Assignment, AssignmentType,
  CourseDashboardData,
} from "@/lib/course-dashboard-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const LESSON_ICON: Record<string, React.ReactNode> = {
  video: <Video className="h-3.5 w-3.5 shrink-0 text-blue-500" />,
  doc:   <FileText className="h-3.5 w-3.5 shrink-0 text-violet-500" />,
  link:  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-emerald-500" />,
};

const TAG_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  DayOff:   { bg: "bg-red-50",    text: "text-red-700",    icon: <X className="h-3 w-3" /> },
  Event:    { bg: "bg-blue-50",   text: "text-blue-700",   icon: <Calendar className="h-3 w-3" /> },
  Reminder: { bg: "bg-yellow-50", text: "text-yellow-700", icon: <AlertCircle className="h-3 w-3" /> },
  Info:     { bg: "bg-gray-50",   text: "text-gray-600",   icon: <Info className="h-3 w-3" /> },
};

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Assignment Form (inside modal) ──────────────────────────────────────────

interface AssignmentFormData {
  title: string;
  type: AssignmentType;
  weekNumber: string;
}

interface AssignmentFormProps {
  initial?: Partial<AssignmentFormData>;
  onSave: (data: AssignmentFormData) => void;
  onCancel: () => void;
}

function AssignmentForm({ initial, onSave, onCancel }: AssignmentFormProps) {
  const [form, setForm] = useState<AssignmentFormData>({
    title: initial?.title ?? "",
    type: initial?.type ?? "MiniChallenge",
    weekNumber: initial?.weekNumber ?? "",
  });
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        type="number"
        min={1}
        placeholder="e.g. 3"
        value={form.weekNumber}
        onChange={(e) => setForm((f) => ({ ...f, weekNumber: e.target.value }))}
      />

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Save
        </Button>
      </div>
    </form>
  );
}

// ─── Week Card ────────────────────────────────────────────────────────────────

function WeekCard({ week }: { week: Week }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Week {week.weekNumber} — {week.title}
        </h3>
      </div>
      <div className="px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          What we&apos;re covering
        </p>
        <ul className="space-y-1.5">
          {week.items.map((item, i) => (
            <li key={i}>
              <Link
                href={item.href}
                className="group flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600"
              >
                {LESSON_ICON[item.type]}
                <span className="flex-1 group-hover:underline">{item.title}</span>
                <ChevronRight className="h-3 w-3 shrink-0 text-gray-300 group-hover:text-blue-400" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Announcements Card ───────────────────────────────────────────────────────

function AnnouncementsCard({ announcements }: { announcements: Announcement[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <Megaphone className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-800">Announcements</h3>
      </div>
      <ul className="divide-y divide-gray-100">
        {announcements.map((ann) => {
          const tag = ann.tag ? TAG_STYLES[ann.tag] : TAG_STYLES.Info;
          return (
            <li key={ann.id} className="px-4 py-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-800">{ann.title}</span>
                {ann.tag && (
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      tag.bg, tag.text
                    )}
                  >
                    {tag.icon}
                    {ann.tag === "DayOff" ? "Day off" : ann.tag}
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-gray-500">{ann.body}</p>
              <p className="mt-1 text-[10px] text-gray-400">{fmtDate(ann.date)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Assignments Grid ─────────────────────────────────────────────────────────

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; assignment: Assignment }
  | null;

const COL_META: { key: keyof CourseDashboardData["assignments"]; label: string; accent: string }[] = [
  { key: "miniChallenges", label: "Mini Challenges", accent: "bg-violet-500" },
  { key: "challenges",     label: "Challenges",      accent: "bg-blue-500"   },
  { key: "projects",       label: "Projects",        accent: "bg-emerald-500" },
];

function AssignmentsGrid({
  courseId,
  initialAssignments,
  canEdit,
}: {
  courseId: string;
  initialAssignments: CourseDashboardData["assignments"];
  canEdit: boolean;
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [modal, setModal] = useState<ModalState>(null);

  function handleSave(data: AssignmentFormData) {
    if (modal?.mode === "create") {
      const newItem: Assignment = {
        courseAssignmentId: `ca_local-${Date.now()}`,
        templateKey: `local-${Date.now()}`,
        title: data.title,
        type: data.type,
        weekNumber: data.weekNumber ? parseInt(data.weekNumber) : undefined,
      };
      setAssignments((prev) => {
        const key =
          data.type === "MiniChallenge" ? "miniChallenges" :
          data.type === "Challenge"     ? "challenges"     : "projects";
        return { ...prev, [key]: [...prev[key], newItem] };
      });
    } else if (modal?.mode === "edit") {
      const edited = modal.assignment;
      setAssignments((prev) => {
        const update = (arr: Assignment[]) =>
          arr.map((a) =>
            a.courseAssignmentId === edited.courseAssignmentId
              ? { ...a, title: data.title, type: data.type,
                  weekNumber: data.weekNumber ? parseInt(data.weekNumber) : undefined }
              : a
          );
        return {
          miniChallenges: update(prev.miniChallenges),
          challenges:     update(prev.challenges),
          projects:       update(prev.projects),
        };
      });
    }
    setModal(null);
  }

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Assignments</h2>
        {canEdit && (
          <Button size="sm" onClick={() => setModal({ mode: "create" })}>
            <Plus className="h-3.5 w-3.5" />
            Create new assignment
          </Button>
        )}
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {COL_META.map(({ key, label, accent }) => (
          <div key={key} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Column header */}
            <div className={clsx("h-1 w-full", accent)} />
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {label}
              </h3>
            </div>

            {/* Assignment list */}
            <ul className="divide-y divide-gray-100">
              {assignments[key].length === 0 && (
                <li className="px-4 py-4 text-center text-xs text-gray-400">
                  No assignments yet.
                </li>
              )}
              {assignments[key].map((a) => (
                <li key={a.courseAssignmentId} className="flex items-center gap-2 px-4 py-2.5">
                  <Link
                    href={`/courses/${courseId}/assignments/${a.courseAssignmentId}`}
                    className="flex-1 text-sm text-gray-700 hover:text-blue-600 hover:underline"
                  >
                    {a.title}
                    {a.weekNumber && (
                      <span className="ml-1.5 text-[10px] text-gray-400">
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

      {/* Modal */}
      {modal && (
        <Modal
          title={modal.mode === "create" ? "Create assignment" : "Edit assignment"}
          onClose={() => setModal(null)}
        >
          <AssignmentForm
            initial={
              modal.mode === "edit"
                ? {
                    title: modal.assignment.title,
                    type: modal.assignment.type,
                    weekNumber: modal.assignment.weekNumber?.toString(),
                  }
                : undefined
            }
            onSave={handleSave}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function CourseDashboardClient({ data }: { data: CourseDashboardData }) {
  const { course, weeks, announcements, assignments, permissions } = data;

  return (
    <div className="mx-auto max-w-6xl space-y-8">

      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className={clsx("h-2 w-full", course.accentColor)} />
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Course
            </p>
            <h1 className="mt-0.5 text-2xl font-bold text-gray-900">{course.subtitle}</h1>
          </div>
          <Link
            href={`/courses/${course.id}/submission-guidelines`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <FileText className="h-4 w-4 text-gray-400" />
            Submission Guidelines
          </Link>
        </div>
      </div>

      {/* ── Weeks + Announcements ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: week cards (2/3 width) */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Weekly content
          </h2>
          {weeks.map((week) => (
            <WeekCard key={week.weekNumber} week={week} />
          ))}
        </div>

        {/* Right: announcements (1/3 width) */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Announcements
          </h2>
          <AnnouncementsCard announcements={announcements} />
        </div>
      </div>

      {/* ── Assignments ────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <AssignmentsGrid
          courseId={course.id}
          initialAssignments={assignments}
          canEdit={permissions.canEditAssignments}
        />
      </div>
    </div>
  );
}
