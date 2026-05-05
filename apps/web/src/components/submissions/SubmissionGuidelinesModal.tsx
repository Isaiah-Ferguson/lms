"use client";

import { useState, useRef, useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface SubmissionGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function SubmissionGuidelinesModal({
  isOpen,
  onClose,
  onAccept,
}: SubmissionGuidelinesModalProps) {
  const reduceMotion = useReducedMotion();
  const [canAccept, setCanAccept] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setCanAccept(false);
      return;
    }

    const checkScroll = () => {
      if (contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        
        // If content doesn't overflow (no scrollbar needed), enable button immediately
        const hasScroll = scrollHeight > clientHeight;
        if (!hasScroll) {
          setCanAccept(true);
          return;
        }
        
        // If scrollable, check if user has scrolled to bottom
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5; // 5px tolerance
        setCanAccept(isAtBottom);
      }
    };

    const content = contentRef.current;
    if (content) {
      // Check initial scroll position with a small delay to ensure content is rendered
      setTimeout(checkScroll, 100);
      
      // Listen for scroll events
      content.addEventListener("scroll", checkScroll);
      
      // Listen for resize events (in case window is resized)
      window.addEventListener("resize", checkScroll);
      
      return () => {
        content.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 dark:bg-black/70 px-4 py-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? {} : { opacity: 0, scale: 0.95 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="submission-guidelines-title"
          className="relative max-h-[90vh] w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-950/30">
                <AlertCircle className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h2 id="submission-guidelines-title" className="text-lg font-bold text-gray-900 dark:text-slate-100">Submission Requirements</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">Please review before submitting</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 dark:text-slate-500 transition hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className="space-y-6 px-6 py-6 overflow-y-auto flex-1"
          >
            {/* File Header Section */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                File Header Required
              </h3>
              <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 p-4">
                <pre className="text-xs leading-relaxed text-gray-700 dark:text-slate-300">
                  {`// Your Name
// Date Revised (last saved date)
// Exercise or Lab Name
// Brief description of what you completed
// Peer Reviewer: Peer name and review`}
                </pre>
              </div>
            </section>

            {/* Peer Review Section */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                Peer Review
              </h3>
              <div className="space-y-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <p className="text-sm text-gray-700 dark:text-slate-300">Your Assignments must be code reviewed.</p>
                <ul className="ml-5 list-disc space-y-1 text-sm text-gray-600 dark:text-slate-400">
                  <li>A Peer must review your work</li>
                  <li>You cannot use the same reviewer twice</li>
                </ul>
              </div>
            </section>

            {/* Submission Contents Section */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                Submission Contents
              </h3>
              <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <p className="text-sm text-gray-700 dark:text-slate-300">Include all required items:</p>
                <ul className="ml-5 mt-2 list-disc space-y-1 text-sm text-gray-600 dark:text-slate-400">
                  <li>Flowchart (if required)</li>
                  <li>All source code files with proper headers</li>
                </ul>
              </div>
            </section>

            {/* Zip File Naming Section */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                Zip File Naming Format
              </h3>
              <div className="space-y-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <p className="text-sm text-gray-700 dark:text-slate-300">Your zip file must follow this format:</p>
                <div className="rounded-lg bg-gray-50 dark:bg-slate-900/50 px-3 py-2">
                  <code className="text-sm font-semibold text-gray-900 dark:text-slate-200">
                    FirstInitialLastNameAssignmentName#.zip
                  </code>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-gray-500 dark:text-slate-500">Example:</p>
                  <code className="text-sm text-brand-600 dark:text-brand-400">IFergusonMC#2.zip</code>
                </div>
              </div>
            </section>

            {/* Warning */}
            <div className="rounded-xl border-2 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-300">Important</p>
                  <ul>
                    <li className="mt-1 text-sm text-red-700 dark:text-red-400">Submissions that do not follow these rules will be <strong>Returned</strong> or graded a <strong>0</strong>.</li>
                    <li className="mt-1 text-sm text-red-700 dark:text-red-400">By submitting this assignment I acknowledge this is my own work, except where I have acknowledged the use of the works of other people.</li>

                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 px-6 py-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-300 transition hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={!canAccept}
              className={`rounded-xl bg-gradient-to-r px-6 py-2.5 text-sm font-semibold shadow-lg transition ${canAccept
                ? "from-brand-600 to-brand-500 text-white shadow-brand-500/30 hover:from-brand-700 hover:to-brand-600 cursor-pointer"
                : "from-gray-400 to-gray-300 text-gray-100 cursor-not-allowed"
                }`}
            >
              {canAccept ? "I Understand, Submit" : "Scroll to Continue"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
