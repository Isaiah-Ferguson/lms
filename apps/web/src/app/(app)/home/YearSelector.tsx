"use client";

import type { AcademicYear } from "@/lib/dashboard-home-data";

interface YearSelectorProps {
  years: AcademicYear[];
  selectedYearId: string;
  onChange: (yearId: string) => void;
}

export function YearSelector({ years, selectedYearId, onChange }: YearSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="dashboard-year" className="text-sm font-semibold text-white/90">
        Year
      </label>
      <select
        id="dashboard-year"
        value={selectedYearId}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-white/30 bg-white/20 backdrop-blur-sm px-4 py-2.5 text-sm font-semibold text-white shadow-lg outline-none transition hover:bg-white/30 focus:bg-white/30 focus:ring-2 focus:ring-white/50"
      >
        {years.map((year) => (
          <option key={year.id} value={year.id} className="text-gray-900 bg-white">
            {year.label} {year.isActive ? "✨" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
