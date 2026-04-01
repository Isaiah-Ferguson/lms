"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { AcademicYear } from "@/lib/dashboard-home-data";
import { ApiError, homeApi } from "@/lib/api-client";
import { getToken } from "@/lib/auth";

interface ManageYearsModalProps {
  isOpen: boolean;
  years: AcademicYear[];
  selectedYearId: string;
  onClose: () => void;
  onViewYear: (yearId: string) => void;
  onYearCreated: (year: AcademicYear) => void;
  onYearActivated: (yearId: string) => void;
}

function getYearStatus(year: AcademicYear): "Active" | "Past" {
  return year.isActive ? "Active" : "Past";
}

export function ManageYearsModal({
  isOpen,
  years,
  selectedYearId,
  onClose,
  onViewYear,
  onYearCreated,
  onYearActivated,
}: ManageYearsModalProps) {
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [setActive, setSetActive] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [activatingYearId, setActivatingYearId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const canCreate = useMemo(
    () => label.trim().length > 0 && startDate.length > 0 && endDate.length > 0,
    [label, startDate, endDate]
  );

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) {
    return null;
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/45 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Manage Academic Years</h2>
            <p className="mt-1 text-sm text-gray-500">Create years, switch context, and manage active status.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="space-y-8 px-6 py-5">
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-700">Years</h3>
            <div className="space-y-3">
              {years.map((year) => (
                <div
                  key={year.id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{year.label}</p>
                    <p className="text-xs text-gray-500">
                      {year.startDate} to {year.endDate}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                      {getYearStatus(year)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onViewYear(year.id)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {selectedYearId === year.id ? "Viewing" : "View"}
                    </button>
                    {!year.isActive && (
                      <button
                        type="button"
                        disabled={activatingYearId === year.id}
                        onClick={async () => {
                          const token = getToken();
                          if (!token) return;
                          setActivatingYearId(year.id);
                          try {
                            await homeApi.setActiveYear(year.id, token);
                            onYearActivated(year.id);
                          } catch {
                            window.alert("Failed to set active year. Please try again.");
                          } finally {
                            setActivatingYearId(null);
                          }
                        }}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        {activatingYearId === year.id ? "Saving..." : "Set Active"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Create New Year</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-medium text-gray-600">
                Label
                <input
                  type="text"
                  placeholder="26-27"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-blue-500/30 focus:border-blue-500 focus:ring-2"
                />
              </label>
              <label className="text-xs font-medium text-gray-600">
                Start Date
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-blue-500/30 focus:border-blue-500 focus:ring-2"
                />
              </label>
              <label className="text-xs font-medium text-gray-600">
                End Date
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-blue-500/30 focus:border-blue-500 focus:ring-2"
                />
              </label>
            </div>

            <label className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-600">
              <input
                type="checkbox"
                checked={setActive}
                onChange={(event) => setSetActive(event.target.checked)}
                className="h-4 w-4 rounded border border-gray-300"
              />
              Set as active year
            </label>

            {createError && (
              <p className="mt-2 text-sm text-red-600">{createError}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canCreate || creating}
                onClick={async () => {
                  const token = getToken();
                  if (!token) return;
                  setCreateError(null);
                  setCreating(true);
                  try {
                    const created = await homeApi.createYear(
                      { label: label.trim(), startDate, endDate, setActive },
                      token
                    );
                    setLabel("");
                    setStartDate("");
                    setEndDate("");
                    setSetActive(true);
                    onYearCreated(created);
                  } catch (err) {
                    setCreateError(err instanceof ApiError ? err.detail : "Failed to create year.");
                  } finally {
                    setCreating(false);
                  }
                }}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {creating ? "Creating..." : "Create Year"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
