"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
import {
  attendanceApi,
  adminParticipantsApi,
  ApiError,
  type AttendanceGrid,
  type AttendanceCode,
  type AttendanceMark,
} from "@/lib/api-client";
import { useAuthedToken } from "@/lib/use-authed-token";
import { Alert } from "@/components/ui/Alert";

// Status cycle order: blank -> P -> L -> E -> U -> Z -> blank
const CYCLE: (AttendanceCode | "")[] = ["", "P", "L", "E", "U", "Z"];

const CODE_STYLE: Record<AttendanceCode, string> = {
  P: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  L: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  E: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  U: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Z: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const LEGEND: { code: AttendanceCode; label: string }[] = [
  { code: "P", label: "Present" },
  { code: "L", label: "Late" },
  { code: "E", label: "Excused" },
  { code: "U", label: "Unexcused" },
  { code: "Z", label: "Zoom (remote sub)" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type LevelOption = { id: string; label: string; yearLabel: string };

function cellKey(studentId: string, date: string) {
  return `${studentId}|${date}`;
}

function nextCode(current: AttendanceCode | ""): AttendanceCode | "" {
  const idx = CYCLE.indexOf(current);
  return CYCLE[(idx + 1) % CYCLE.length];
}

export default function AttendancePage() {
  const token = useAuthedToken();
  const now = new Date();

  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [courseId, setCourseId] = useState<string>("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based

  const [grid, setGrid] = useState<AttendanceGrid | null>(null);
  // Working copy of marks keyed by `${studentId}|${date}`
  const [marks, setMarks] = useState<Record<string, AttendanceCode | "">>({});
  const [original, setOriginal] = useState<Record<string, AttendanceCode | "">>({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Load the level (course) options once.
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await adminParticipantsApi.getParticipants(token);
        const opts = data.courses.map((c) => ({
          id: c.id,
          label: c.label,
          yearLabel: c.yearLabel,
        }));
        setLevels(opts);
        if (opts.length > 0) setCourseId((prev) => prev || opts[0].id);
      } catch (e) {
        setError(e instanceof ApiError ? e.detail : "Failed to load levels.");
      }
    })();
  }, [token]);

  const loadGrid = useCallback(async () => {
    if (!token || !courseId) return;
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const data = await attendanceApi.getMonthGrid(courseId, year, month, token);
      setGrid(data);
      const map: Record<string, AttendanceCode | ""> = {};
      for (const s of data.students) {
        for (const m of s.marks) {
          map[cellKey(s.studentId, m.date)] = m.status;
        }
      }
      setMarks(map);
      setOriginal(map);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Failed to load attendance.");
      setGrid(null);
    } finally {
      setLoading(false);
    }
  }, [token, courseId, year, month]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  const dirtyKeys = useMemo(() => {
    const keys = new Set<string>();
    const all = Array.from(new Set(Object.keys(marks).concat(Object.keys(original))));
    for (const k of all) {
      if ((marks[k] ?? "") !== (original[k] ?? "")) keys.add(k);
    }
    return keys;
  }, [marks, original]);

  const isDirty = dirtyKeys.size > 0;

  function toggleCell(studentId: string, date: string) {
    const key = cellKey(studentId, date);
    setMarks((prev) => ({ ...prev, [key]: nextCode(prev[key] ?? "") }));
  }

  function countFor(studentId: string, code: AttendanceCode) {
    if (!grid) return 0;
    let n = 0;
    for (const d of grid.days) {
      if ((marks[cellKey(studentId, d.date)] ?? "") === code) n++;
    }
    return n;
  }

  async function handleSave() {
    if (!token || !courseId || !isDirty || saving) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const payload: AttendanceMark[] = [];
      for (const key of Array.from(dirtyKeys)) {
        const [studentId, date] = key.split("|");
        const status = marks[key] ?? "";
        payload.push({ studentId, date, status: status === "" ? null : status });
      }
      await attendanceApi.saveAttendance({ courseId, marks: payload }, token);
      setOriginal({ ...marks });
      setMsg(`Saved ${payload.length} change${payload.length === 1 ? "" : "s"}.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  }

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-slate-50">
            <CalendarCheck className="h-7 w-7 text-brand-500" />
            Attendance
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-800">
            Click a cell to cycle status. Tue/Thu are remote days, M/W/F are in person.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Level selector */}
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-slate-800">
            Level
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {levels.length === 0 && <option value="">No levels</option>}
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.yearLabel} — {l.label}
                </option>
              ))}
            </select>
          </label>

          {/* Month nav */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-1">
            <button
              onClick={() => changeMonth(-1)}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[130px] text-center text-sm font-semibold text-gray-800 dark:text-slate-200">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="flex items-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isDirty ? `Save (${dirtyKeys.size})` : "Saved"}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-slate-700">
        {LEGEND.map((l) => (
          <span key={l.code} className="inline-flex items-center gap-1.5">
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded font-bold ${CODE_STYLE[l.code]}`}>
              {l.code}
            </span>
            {l.label}
          </span>
        ))}
      </div>

      {msg && <Alert variant="success" message={msg} />}
      {error && <Alert variant="error" message={error} />}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400 dark:text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !grid || grid.students.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 py-20 text-center">
          <CalendarCheck className="mb-4 h-10 w-10 text-gray-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
            No active students enrolled in this level.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40">
                <th className="sticky left-0 z-10 bg-gray-50 dark:bg-slate-800 px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-400 min-w-[180px]">
                  Student
                </th>
                {grid.days.map((d) => (
                  <th
                    key={d.date}
                    className="px-1 py-2 text-center font-medium text-gray-500 dark:text-slate-400 min-w-[40px]"
                    title={`${d.date} · ${d.sessionType === "Remote" ? "Remote" : "In person"}`}
                  >
                    <div className={`text-[10px] font-semibold ${d.sessionType === "Remote" ? "text-purple-500" : "text-gray-400 dark:text-slate-500"}`}>
                      {d.dayOfWeek}
                    </div>
                    <div className="text-gray-700 dark:text-slate-300">
                      {Number(d.date.slice(8, 10))}
                    </div>
                  </th>
                ))}
                {(["P", "L", "E", "U", "Z"] as AttendanceCode[]).map((c) => (
                  <th key={c} className="px-2 py-3 text-center font-semibold text-gray-500 dark:text-slate-400 border-l border-gray-100 dark:border-slate-800">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {grid.students.map((s) => (
                <tr key={s.studentId} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                  <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-4 py-2 font-medium text-gray-900 dark:text-slate-100 min-w-[180px]">
                    {s.name}
                  </td>
                  {grid.days.map((d) => {
                    const code = marks[cellKey(s.studentId, d.date)] ?? "";
                    return (
                      <td key={d.date} className="px-0.5 py-1 text-center">
                        <button
                          onClick={() => toggleCell(s.studentId, d.date)}
                          className={`h-7 w-7 rounded text-xs font-bold transition-colors ${
                            code === ""
                              ? "text-gray-300 hover:bg-gray-100 dark:text-white-600 dark:hover:bg-slate-800"
                              : CODE_STYLE[code]
                          }`}
                          title={`${s.name} · ${d.date}`}
                        >
                          {code === "" ? "·" : code}
                        </button>
                      </td>
                    );
                  })}
                  {(["P", "L", "E", "U", "Z"] as AttendanceCode[]).map((c) => (
                    <td key={c} className="px-2 py-2 text-center text-gray-500 dark:text-slate-400 border-l border-gray-100 dark:border-slate-800">
                      {countFor(s.studentId, c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
