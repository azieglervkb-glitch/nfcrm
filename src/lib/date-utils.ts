import { startOfWeek, endOfWeek, format, getWeek, getWeekYear, addWeeks, subWeeks } from "date-fns";
import { de } from "date-fns/locale";

/**
 * Get the Monday of the current week (German local time)
 * Returns a Date object set to Monday 00:00:00 local time
 */
export function getCurrentWeekStart(): Date {
  const now = new Date();
  // Get Monday of current week in local time (Germany)
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  // Set to midnight local time
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get week number and year for a date (ISO week year)
 * Note: Uses ISO week year, so Dec 29, 2025 = KW 1/2026
 */
export function getWeekInfo(date: Date): { weekNumber: number; year: number } {
  const options = { weekStartsOn: 1 as const, firstWeekContainsDate: 4 as const };
  return {
    weekNumber: getWeek(date, options),
    year: getWeekYear(date, options),
  };
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string, formatStr: string = "dd.MM.yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, formatStr, { locale: de });
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "gerade eben";
  if (diffMins < 60) return `vor ${diffMins} Min`;
  if (diffHours < 24) return `vor ${diffHours} Std`;
  if (diffDays === 1) return "gestern";
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return formatDate(d);
}

/**
 * Get week range string (e.g., "16.12. - 22.12.2024")
 */
export function getWeekRangeString(weekStart: Date): string {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const startStr = format(weekStart, "dd.MM.", { locale: de });
  const endStr = format(weekEnd, "dd.MM.yyyy", { locale: de });
  return `${startStr} - ${endStr}`;
}

/**
 * Navigate weeks
 */
export function getNextWeek(date: Date): Date {
  const next = addWeeks(date, 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function getPreviousWeek(date: Date): Date {
  const prev = subWeeks(date, 1);
  prev.setHours(0, 0, 0, 0);
  return prev;
}

/**
 * Check if a date is in the current week
 */
export function isCurrentWeek(date: Date): boolean {
  const currentWeekStart = getCurrentWeekStart();
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.getTime() === currentWeekStart.getTime();
}

/**
 * Get ISO week string for URLs/IDs (e.g., "2024-W52")
 */
export function getIsoWeekString(date: Date): string {
  const { weekNumber, year } = getWeekInfo(date);
  return `${year}-W${weekNumber.toString().padStart(2, "0")}`;
}

/**
 * Parse ISO week string back to Date (Monday of that week)
 */
export function parseIsoWeekString(isoWeek: string): Date {
  const [year, week] = isoWeek.split("-W").map(Number);
  // Find January 4th (always in week 1 per ISO)
  const jan4 = new Date(year, 0, 4);
  jan4.setHours(0, 0, 0, 0);
  const startOfYear = startOfWeek(jan4, { weekStartsOn: 1 });
  startOfYear.setHours(0, 0, 0, 0);
  const result = addWeeks(startOfYear, week - 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Normalize a weekStart date to midnight local time
 * Use this to fix any date that might have timezone issues
 */
export function normalizeWeekStart(date: Date): Date {
  const d = new Date(date);
  // Get the Monday of that week
  const monday = startOfWeek(d, { weekStartsOn: 1 });
  monday.setHours(0, 0, 0, 0);
  return monday;
}
