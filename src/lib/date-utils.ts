import { startOfWeek, endOfWeek, format, getWeek, getYear, addWeeks, subWeeks } from "date-fns";
import { de } from "date-fns/locale";

// Get the Monday of the current week
export function getCurrentWeekStart(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

// Get week number and year for a date
export function getWeekInfo(date: Date): { weekNumber: number; year: number } {
  return {
    weekNumber: getWeek(date, { weekStartsOn: 1 }),
    year: getYear(date),
  };
}

// Format a date for display
export function formatDate(date: Date | string, formatStr: string = "dd.MM.yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, formatStr, { locale: de });
}

// Format relative time
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

// Get week range string (e.g., "16.12. - 22.12.2024")
export function getWeekRangeString(weekStart: Date): string {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const startStr = format(weekStart, "dd.MM.", { locale: de });
  const endStr = format(weekEnd, "dd.MM.yyyy", { locale: de });
  return `${startStr} - ${endStr}`;
}

// Navigate weeks
export function getNextWeek(date: Date): Date {
  return addWeeks(date, 1);
}

export function getPreviousWeek(date: Date): Date {
  return subWeeks(date, 1);
}

// Check if a date is in the current week
export function isCurrentWeek(date: Date): boolean {
  const currentWeekStart = getCurrentWeekStart();
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  return weekStart.getTime() === currentWeekStart.getTime();
}

// Get ISO week string for URLs/IDs (e.g., "2024-W52")
export function getIsoWeekString(date: Date): string {
  const { weekNumber, year } = getWeekInfo(date);
  return `${year}-W${weekNumber.toString().padStart(2, "0")}`;
}

// Parse ISO week string back to Date
export function parseIsoWeekString(isoWeek: string): Date {
  const [year, week] = isoWeek.split("-W").map(Number);
  const jan4 = new Date(year, 0, 4);
  const startOfYear = startOfWeek(jan4, { weekStartsOn: 1 });
  return addWeeks(startOfYear, week - 1);
}
