import { prisma } from "./prisma";

export interface SendWhatsAppOptions {
  phone: string; // Format: +49XXXXXXXXXXX
  message: string;
  memberId?: string; // For logging
  type?: "REMINDER" | "FEEDBACK" | "CELEBRATION" | "ALERT" | "MANUAL";
  ruleId?: string;
}

export async function sendWhatsApp({
  phone,
  message,
  memberId,
  type = "MANUAL",
  ruleId,
}: SendWhatsAppOptions): Promise<boolean> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!apiUrl || !apiKey) {
    console.warn("WhatsApp API not configured, skipping message");
    return false;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        phone,
        message,
      }),
    });

    const success = response.ok;

    // Log the communication
    if (memberId) {
      await prisma.communicationLog.create({
        data: {
          memberId,
          channel: "WHATSAPP",
          type,
          content: message,
          recipient: phone,
          sent: success,
          sentAt: success ? new Date() : null,
          errorMessage: success ? null : `HTTP ${response.status}`,
          ruleId,
        },
      });
    }

    if (!success) {
      console.error(`WhatsApp API error: ${response.status} ${response.statusText}`);
    }

    return success;
  } catch (error) {
    console.error("WhatsApp send error:", error);

    // Log failed attempt
    if (memberId) {
      await prisma.communicationLog.create({
        data: {
          memberId,
          channel: "WHATSAPP",
          type,
          content: message,
          recipient: phone,
          sent: false,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          ruleId,
        },
      });
    }

    return false;
  }
}

// Get settings from database or use defaults
export async function getQuietHoursSettings(): Promise<{
  start: number;
  end: number;
  enabled: boolean;
}> {
  try {
    const settings = await prisma.systemSettings.findFirst();
    return {
      start: settings?.quietHoursStart ?? 21,
      end: settings?.quietHoursEnd ?? 8,
      enabled: settings?.quietHoursEnabled ?? true,
    };
  } catch {
    return { start: 21, end: 8, enabled: true };
  }
}

// Check if current time is in quiet hours
export async function isInQuietHours(): Promise<boolean> {
  const settings = await getQuietHoursSettings();

  if (!settings.enabled) return false;

  const now = new Date();
  const currentHour = now.getHours();

  if (settings.start > settings.end) {
    // Spans midnight (e.g., 21:00 - 08:00)
    return currentHour >= settings.start || currentHour < settings.end;
  } else {
    // Same day (e.g., 01:00 - 06:00)
    return currentHour >= settings.start && currentHour < settings.end;
  }
}

// Synchronous version for quick checks (uses defaults)
export function isInQuietHoursSync(
  quietHoursStart: number = 21,
  quietHoursEnd: number = 8
): boolean {
  const now = new Date();
  const currentHour = now.getHours();

  if (quietHoursStart > quietHoursEnd) {
    return currentHour >= quietHoursStart || currentHour < quietHoursEnd;
  } else {
    return currentHour >= quietHoursStart && currentHour < quietHoursEnd;
  }
}

/**
 * Check if a given time falls into quiet hours
 */
function isTimeInQuietHours(
  date: Date,
  quietHoursStart: number,
  quietHoursEnd: number
): boolean {
  const hour = date.getHours();

  if (quietHoursStart > quietHoursEnd) {
    // Spans midnight (e.g., 21:00 - 08:00)
    return hour >= quietHoursStart || hour < quietHoursEnd;
  } else {
    // Same day (e.g., 01:00 - 06:00)
    return hour >= quietHoursStart && hour < quietHoursEnd;
  }
}

/**
 * Adjusts a scheduled time to avoid quiet hours.
 * If the scheduled time falls within quiet hours, it's moved to the end of quiet hours
 * plus a random delay (0-60 min) to avoid all messages arriving at the same time.
 */
export async function adjustForQuietHours(scheduledFor: Date): Promise<Date> {
  const settings = await getQuietHoursSettings();

  if (!settings.enabled) return scheduledFor;

  if (!isTimeInQuietHours(scheduledFor, settings.start, settings.end)) {
    // Not in quiet hours, return as-is
    return scheduledFor;
  }

  // The scheduled time falls in quiet hours, reschedule to after quiet hours end
  const adjusted = new Date(scheduledFor);

  // If quiet hours span midnight (e.g., 21:00 - 08:00), the end is on the next day
  if (settings.start > settings.end) {
    // Check if we're before midnight
    if (adjusted.getHours() >= settings.start) {
      // Move to next day
      adjusted.setDate(adjusted.getDate() + 1);
    }
    // Set to end of quiet hours (e.g., 08:00)
    adjusted.setHours(settings.end, 0, 0, 0);
  } else {
    // Same day quiet hours
    adjusted.setHours(settings.end, 0, 0, 0);
  }

  // Add random delay (0-60 minutes) so messages don't all arrive at exactly the same time
  const randomDelayMinutes = Math.floor(Math.random() * 60);
  adjusted.setMinutes(randomDelayMinutes);

  return adjusted;
}
