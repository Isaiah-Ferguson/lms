/**
 * Parse an API date string into a Date, normalizing naive (no-timezone) strings as UTC.
 *
 * The backend often emits naive ISO 8601 strings like "2026-04-24T16:47:00" which
 * JavaScript would otherwise interpret as LOCAL time. This helper appends 'Z' so
 * the string is parsed as UTC and displayed correctly in the user's local timezone.
 *
 * @param dateString - ISO 8601 date string from the API (may or may not have timezone)
 * @returns a Date, or null if the input is null/undefined/invalid
 */
export function parseApiDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;

  let normalized = dateString;
  if (!dateString.endsWith('Z') && !dateString.includes('+') && !dateString.includes('T')) {
    // Date-only — treat as UTC midnight
    normalized = dateString + 'T00:00:00Z';
  } else if (dateString.includes('T') && !dateString.endsWith('Z') && !dateString.includes('+')) {
    // Naive datetime — treat as UTC
    normalized = dateString + 'Z';
  }

  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
}

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

  const date = parseApiDate(dateString);
  if (!date) return "Invalid date";

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

  const date = parseApiDate(dateString);
  if (!date) return "Invalid date";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

