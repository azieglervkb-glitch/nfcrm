export interface SendWhatsAppOptions {
  recipient: string; // Format: +49XXXXXXXXXXX
  message: string;
}

export async function sendWhatsApp({
  recipient,
  message,
}: SendWhatsAppOptions): Promise<boolean> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error("WhatsApp API not configured");
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
        recipient,
        message,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return false;
  }
}

// Check if current time is in quiet hours
export function isInQuietHours(
  quietHoursStart: number = 21,
  quietHoursEnd: number = 8
): boolean {
  const now = new Date();
  const currentHour = now.getHours();

  if (quietHoursStart > quietHoursEnd) {
    // Spans midnight (e.g., 21:00 - 08:00)
    return currentHour >= quietHoursStart || currentHour < quietHoursEnd;
  } else {
    // Same day (e.g., 01:00 - 06:00)
    return currentHour >= quietHoursStart && currentHour < quietHoursEnd;
  }
}
