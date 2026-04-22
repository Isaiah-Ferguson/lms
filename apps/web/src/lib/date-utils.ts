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

  // Ensure the date string is treated as UTC if it doesn't have timezone info
  let normalizedDateString = dateString;
  if (!dateString.endsWith('Z') && !dateString.includes('+') && !dateString.includes('T')) {
    // If it's just a date without time, treat as UTC
    normalizedDateString = dateString + 'T00:00:00Z';
  } else if (dateString.includes('T') && !dateString.endsWith('Z') && !dateString.includes('+')) {
    // If it has time but no timezone, add Z for UTC
    normalizedDateString = dateString + 'Z';
  }

  const date = new Date(normalizedDateString);
  
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

