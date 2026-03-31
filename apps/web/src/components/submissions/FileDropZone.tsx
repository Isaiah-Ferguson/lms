"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";

const ALLOWED_EXTENSIONS = [
  ".zip", ".pdf", ".txt", ".py", ".java", ".c", ".cpp",
  ".js", ".ts", ".md", ".json",
];

const ALLOWED_MIME = new Set([
  "application/zip", "application/x-zip-compressed",
  "application/pdf", "text/plain", "text/x-python",
  "text/x-java-source", "text/x-csrc", "text/x-c++src",
  "application/javascript", "text/javascript",
  "application/typescript", "text/markdown", "application/json",
  "application/octet-stream",
]);

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_FILES = 20;

export interface SelectedFile {
  file: File;
  id: string;
}

interface FileDropZoneProps {
  files: SelectedFile[];
  onChange: (files: SelectedFile[]) => void;
  disabled?: boolean;
}

export function FileDropZone({ files, onChange, disabled }: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndAdd(incoming: File[]) {
    setError(null);
    const errors: string[] = [];
    const valid: SelectedFile[] = [];

    for (const f of incoming) {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME.has(f.type)) {
        errors.push(`"${f.name}" — unsupported file type`);
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        errors.push(`"${f.name}" exceeds the 100 MB limit`);
        continue;
      }
      valid.push({ file: f, id: crypto.randomUUID() });
    }

    if (errors.length) setError(errors.join("; "));

    const combined = [...files, ...valid];
    if (combined.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed`);
      onChange(combined.slice(0, MAX_FILES));
    } else {
      onChange(combined);
    }
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      validateAndAdd(Array.from(e.dataTransfer.files));
    },
    [files, disabled] // eslint-disable-line react-hooks/exhaustive-deps
  );

  function removeFile(id: string) {
    onChange(files.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop files here or click to browse"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          dragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <Upload className="h-8 w-8 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-700">
            Drop files here or{" "}
            <span className="text-blue-600">browse</span>
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {ALLOWED_EXTENSIONS.join(", ")} · max 100 MB per file · up to {MAX_FILES} files
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept={ALLOWED_EXTENSIONS.join(",")}
          onChange={(e) => {
            if (e.target.files) validateAndAdd(Array.from(e.target.files));
            e.target.value = "";
          }}
          disabled={disabled}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map(({ file, id }) => (
            <li
              key={id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5"
            >
              <FileText className="h-4 w-4 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">
                  {file.name}
                </p>
                <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeFile(id)}
                  className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
