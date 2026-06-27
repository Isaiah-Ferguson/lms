import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatStatus(status: string): string {
  return status.replace(/([A-Z])/g, " $1").trim();
}

/** First letters of the first two words of a name, uppercased (e.g. "Ada Lovelace" → "AL"). */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Prefix a bare URL with https:// if it has no protocol. Returns undefined for empty input. */
export function ensureProtocol(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

/** Pull the filename out of a Content-Disposition header, falling back to a default. */
export function extractFileName(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  return match?.[1]?.replace(/['"]/g, "") ?? fallback;
}

/** Trigger a browser download for an in-memory blob. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Fetch a URL and download the response as a file. Throws if the request fails. */
export async function downloadFromUrl(url: string, fileName: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Download failed");
  downloadBlob(await response.blob(), fileName);
}

/** Serialize rows to CSV (quoting every cell) and download them as a .csv file. */
export function downloadCsv(fileName: string, rows: (string | number)[][]): void {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(","))
    .join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), fileName);
}
