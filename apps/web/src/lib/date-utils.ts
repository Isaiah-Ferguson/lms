/**
 * Format a date string (ISO 8601) to a localized date and time string
 * @param dateString - ISO 8601 date string from the API
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string in user's local timezone
 */
export function formatDateTime(
  dateString: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return "—";

  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return "Invalid date";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...options,
  };

  return date.toLocaleString(undefined, defaultOptions);
}

/**
 * Format a date string to just the date (no time)
 * @param dateString - ISO 8601 date string from the API
 * @returns Formatted date string
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";

  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date string to a relative time (e.g., "2 hours ago")
 * @param dateString - ISO 8601 date string from the API
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "—";

  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return "Invalid date";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  
  return formatDate(dateString);
}
