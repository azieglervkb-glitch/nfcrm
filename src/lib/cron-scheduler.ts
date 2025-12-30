import { prisma } from "@/lib/prisma";

/**
 * Checks if the current time matches the configured schedule for a specific cron job.
 * This allows cronjobs to run every minute but only execute when the time matches the settings.
 */

interface ScheduleMatch {
  shouldRun: boolean;
  reason: string;
  reminderType?: 1 | 2; // Which reminder is triggered (for KPI reminders)
}

/**
 * Get current time in Europe/Berlin timezone
 */
function getBerlinTime(): Date {
  const now = new Date();
  // Convert to Berlin time
  const berlinTimeString = now.toLocaleString("en-US", { timeZone: "Europe/Berlin" });
  return new Date(berlinTimeString);
}

/**
 * Check if current time matches KPI reminder schedule
 * Settings: kpiReminderDay1, kpiReminderTime1, kpiReminderDay2, kpiReminderTime2
 */
export async function shouldRunKpiReminder(): Promise<ScheduleMatch> {
  const settings = await prisma.systemSettings.findFirst({
    where: { id: "default" },
  });

  if (!settings?.kpiReminderEnabled) {
    return { shouldRun: false, reason: "KPI reminders disabled" };
  }

  const now = getBerlinTime();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Parse times from settings (format: "HH:MM")
  const [hour1, minute1] = (settings.kpiReminderTime1 || "08:00").split(":").map(Number);
  const [hour2, minute2] = (settings.kpiReminderTime2 || "18:00").split(":").map(Number);

  // Check first reminder (Friday - for current week)
  if (currentDay === settings.kpiReminderDay1 && currentHour === hour1 && currentMinute === minute1) {
    return { shouldRun: true, reason: `First reminder: Day ${currentDay}, ${hour1}:${minute1}`, reminderType: 1 };
  }

  // Check second reminder (Monday - deadline reminder for previous week)
  if (currentDay === settings.kpiReminderDay2 && currentHour === hour2 && currentMinute === minute2) {
    return { shouldRun: true, reason: `Second reminder: Day ${currentDay}, ${hour2}:${minute2}`, reminderType: 2 };
  }

  return {
    shouldRun: false,
    reason: `Not scheduled. Current: Day ${currentDay} ${currentHour}:${currentMinute}. Expected: Day ${settings.kpiReminderDay1} ${hour1}:${minute1} or Day ${settings.kpiReminderDay2} ${hour2}:${minute2}`,
  };
}

/**
 * Check if current time matches scheduled automations schedule
 * Settings: automationsDay, automationsTime
 */
export async function shouldRunScheduledAutomations(): Promise<ScheduleMatch> {
  const settings = await prisma.systemSettings.findFirst({
    where: { id: "default" },
  });

  if (!settings?.automationsEnabled) {
    return { shouldRun: false, reason: "Automations disabled" };
  }

  const now = getBerlinTime();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const [hour, minute] = (settings.automationsTime || "09:00").split(":").map(Number);

  if (currentDay === settings.automationsDay && currentHour === hour && currentMinute === minute) {
    return { shouldRun: true, reason: `Scheduled: Day ${currentDay}, ${hour}:${minute}` };
  }

  return {
    shouldRun: false,
    reason: `Not scheduled. Current: Day ${currentDay} ${currentHour}:${currentMinute}. Expected: Day ${settings.automationsDay} ${hour}:${minute}`,
  };
}

/**
 * Check if current time matches system health check schedule (daily at 07:00)
 */
export async function shouldRunSystemHealth(): Promise<ScheduleMatch> {
  const now = getBerlinTime();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Fixed schedule: Daily at 07:00
  if (currentHour === 7 && currentMinute === 0) {
    return { shouldRun: true, reason: "Daily health check at 07:00" };
  }

  return {
    shouldRun: false,
    reason: `Not scheduled. Current: ${currentHour}:${currentMinute}. Expected: 07:00`,
  };
}

/**
 * Prevent duplicate runs within the same minute
 * Uses AutomationLog to check if already run
 */
export async function hasRunThisMinute(ruleId: string, ruleName: string): Promise<boolean> {
  const now = new Date();
  const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0);
  
  const recentRun = await prisma.automationLog.findFirst({
    where: {
      ruleId,
      ruleName,
      firedAt: { gte: minuteStart },
    },
  });

  return !!recentRun;
}

/**
 * Check if current time matches onboarding reminders schedule (daily at 10:00)
 */
export async function shouldRunOnboardingReminders(): Promise<ScheduleMatch> {
  const now = getBerlinTime();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Fixed schedule: Daily at 10:00
  if (currentHour === 10 && currentMinute === 0) {
    return { shouldRun: true, reason: "Daily onboarding reminders at 10:00" };
  }

  return {
    shouldRun: false,
    reason: `Not scheduled. Current: ${currentHour}:${currentMinute}. Expected: 10:00`,
  };
}

/**
 * Check if current time matches KPI setup reminders schedule (daily at 10:30)
 */
export async function shouldRunKpiSetupReminders(): Promise<ScheduleMatch> {
  const now = getBerlinTime();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Fixed schedule: Daily at 10:30
  if (currentHour === 10 && currentMinute === 30) {
    return { shouldRun: true, reason: "Daily KPI setup reminders at 10:30" };
  }

  return {
    shouldRun: false,
    reason: `Not scheduled. Current: ${currentHour}:${currentMinute}. Expected: 10:30`,
  };
}

interface ShouldCronRunResult extends ScheduleMatch {
  nextRun?: string;
}

interface KpiTrackingWindowStatus {
  isOpen: boolean;
  reason: string;
  opensAt?: Date;
  closesAt?: Date;
}

/**
 * Check if the KPI tracking window is currently open
 * Window is open from Friday 12:00 to Monday 20:00
 * Returns status and when window opens/closes
 */
export async function isKpiTrackingWindowOpen(): Promise<KpiTrackingWindowStatus> {
  const settings = await prisma.systemSettings.findFirst({
    where: { id: "default" },
  });

  const now = getBerlinTime();
  const currentDay = now.getDay(); // 0 = Sunday
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  // Get settings or defaults
  const openDay = settings?.kpiTrackingWindowOpenDay ?? 5; // Friday
  const closeDay = settings?.kpiTrackingWindowCloseDay ?? 1; // Monday
  const [openHour, openMin] = (settings?.kpiTrackingWindowOpenTime ?? "12:00").split(":").map(Number);
  const [closeHour, closeMin] = (settings?.kpiTrackingWindowCloseTime ?? "20:00").split(":").map(Number);
  const openTimeMinutes = openHour * 60 + openMin;
  const closeTimeMinutes = closeHour * 60 + closeMin;

  // Calculate days until open and close for status messages
  const daysUntilOpen = (openDay - currentDay + 7) % 7;
  const daysUntilClose = (closeDay - currentDay + 7) % 7;

  // Window logic: Open from Friday 12:00 to Monday 20:00
  // Days involved: Friday (5), Saturday (6), Sunday (0), Monday (1)

  let isOpen = false;

  if (currentDay === openDay) {
    // Friday - open after openTime
    isOpen = currentTimeMinutes >= openTimeMinutes;
  } else if (currentDay === 6) {
    // Saturday - always open
    isOpen = true;
  } else if (currentDay === 0) {
    // Sunday - always open
    isOpen = true;
  } else if (currentDay === closeDay) {
    // Monday - open until closeTime
    isOpen = currentTimeMinutes < closeTimeMinutes;
  }
  // Tuesday-Thursday: closed

  if (isOpen) {
    // Calculate when window closes
    const closesAt = new Date(now);
    if (currentDay === closeDay) {
      // Already Monday, closes today
      closesAt.setHours(closeHour, closeMin, 0, 0);
    } else {
      // Calculate days until Monday
      const daysToMonday = (closeDay - currentDay + 7) % 7;
      closesAt.setDate(closesAt.getDate() + daysToMonday);
      closesAt.setHours(closeHour, closeMin, 0, 0);
    }

    return {
      isOpen: true,
      reason: `Tracking offen bis ${DAYS_DE[closeDay]} ${closeHour}:${String(closeMin).padStart(2, "0")} Uhr`,
      closesAt,
    };
  } else {
    // Calculate when window opens
    const opensAt = new Date(now);
    const daysToFriday = (openDay - currentDay + 7) % 7 || 7; // If today is Friday and past time, next Friday

    if (currentDay === openDay && currentTimeMinutes < openTimeMinutes) {
      // It's Friday but before open time
      opensAt.setHours(openHour, openMin, 0, 0);
    } else {
      opensAt.setDate(opensAt.getDate() + daysToFriday);
      opensAt.setHours(openHour, openMin, 0, 0);
    }

    return {
      isOpen: false,
      reason: `Tracking geschlossen. Öffnet ${DAYS_DE[openDay]} um ${openHour}:${String(openMin).padStart(2, "0")} Uhr`,
      opensAt,
    };
  }
}

const DAYS_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

/**
 * Generic function to check if a cron should run
 * @param cronKey - The key identifying which cron to check
 */
export async function shouldCronRun(cronKey: string): Promise<ShouldCronRunResult> {
  switch (cronKey) {
    case "kpiReminder":
      return shouldRunKpiReminder();
    case "scheduledAutomations":
      return shouldRunScheduledAutomations();
    case "systemHealth":
      return shouldRunSystemHealth();
    case "onboardingReminders":
      return shouldRunOnboardingReminders();
    case "kpiSetupReminders":
      return shouldRunKpiSetupReminders();
    default:
      return { shouldRun: false, reason: `Unknown cron key: ${cronKey}` };
  }
}

