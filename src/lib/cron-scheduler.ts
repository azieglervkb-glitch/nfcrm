import { prisma } from "@/lib/prisma";

/**
 * Checks if the current time matches the configured schedule for a specific cron job.
 * This allows cronjobs to run every minute but only execute when the time matches the settings.
 */

interface ScheduleMatch {
  shouldRun: boolean;
  reason: string;
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

  console.log("[SCHEDULER] KPI Reminder - Settings:", {
    enabled: settings?.kpiReminderEnabled,
    day1: settings?.kpiReminderDay1,
    time1: settings?.kpiReminderTime1,
    day2: settings?.kpiReminderDay2,
    time2: settings?.kpiReminderTime2,
  });

  if (!settings?.kpiReminderEnabled) {
    return { shouldRun: false, reason: "KPI reminders disabled" };
  }

  const now = getBerlinTime();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  console.log("[SCHEDULER] Current time:", { currentDay, currentHour, currentMinute, nowString: now.toISOString() });

  // Parse times from settings (format: "HH:MM")
  const [hour1, minute1] = (settings.kpiReminderTime1 || "08:00").split(":").map(Number);
  const [hour2, minute2] = (settings.kpiReminderTime2 || "18:00").split(":").map(Number);

  console.log("[SCHEDULER] Parsed times:", { hour1, minute1, hour2, minute2 });

  // Check first reminder
  const match1 = currentDay === settings.kpiReminderDay1 && currentHour === hour1 && currentMinute === minute1;
  const match2 = currentDay === settings.kpiReminderDay2 && currentHour === hour2 && currentMinute === minute2;
  
  console.log("[SCHEDULER] Match check:", { match1, match2 });

  if (match1) {
    return { shouldRun: true, reason: `First reminder: Day ${currentDay}, ${hour1}:${minute1}` };
  }

  // Check second reminder
  if (match2) {
    return { shouldRun: true, reason: `Second reminder: Day ${currentDay}, ${hour2}:${minute2}` };
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

