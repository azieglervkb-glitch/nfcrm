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
