"use client";

import { X } from "lucide-react";
import { clsx } from "clsx";

export function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  const titleId = `modal-title-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}
    >
      <div className={clsx(
        "w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl",
        wide ? "max-w-lg" : "max-w-md"
      )}>
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
