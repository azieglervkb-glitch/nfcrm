import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access integration settings
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get settings from database
    const settings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: [
            "whatsapp_api_url",
            "whatsapp_api_key",
            "whatsapp_enabled",
            "openai_api_key",
            "openai_enabled",
            "copecart_webhook_secret",
            "copecart_enabled",
          ],
        },
      },
    });

    const settingsMap: { [key: string]: string } = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({
      whatsappApiUrl: settingsMap.whatsapp_api_url || "",
      whatsappApiKey: settingsMap.whatsapp_api_key ? "••••••••" : "",
      whatsappEnabled: settingsMap.whatsapp_enabled === "true",
      openaiApiKey: settingsMap.openai_api_key ? "••••••••" : "",
      openaiEnabled: settingsMap.openai_enabled === "true",
      copecartWebhookSecret: settingsMap.copecart_webhook_secret ? "••••••••" : "",
      copecartEnabled: settingsMap.copecart_enabled === "true",
    });
  } catch (error) {
    console.error("Failed to fetch integration settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update integration settings
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { integration, ...data } = body;

    const updates: { key: string; value: string }[] = [];

    if (integration === "whatsapp") {
      if (data.whatsappApiUrl !== undefined) {
        updates.push({ key: "whatsapp_api_url", value: data.whatsappApiUrl });
      }
      if (data.whatsappApiKey && data.whatsappApiKey !== "••••••••") {
        updates.push({ key: "whatsapp_api_key", value: data.whatsappApiKey });
      }
      if (data.whatsappEnabled !== undefined) {
        updates.push({ key: "whatsapp_enabled", value: String(data.whatsappEnabled) });
      }
    } else if (integration === "openai") {
      if (data.openaiApiKey && data.openaiApiKey !== "••••••••") {
        updates.push({ key: "openai_api_key", value: data.openaiApiKey });
      }
      if (data.openaiEnabled !== undefined) {
        updates.push({ key: "openai_enabled", value: String(data.openaiEnabled) });
      }
    } else if (integration === "copecart") {
      if (data.copecartWebhookSecret && data.copecartWebhookSecret !== "••••••••") {
        updates.push({ key: "copecart_webhook_secret", value: data.copecartWebhookSecret });
      }
      if (data.copecartEnabled !== undefined) {
        updates.push({ key: "copecart_enabled", value: String(data.copecartEnabled) });
      }
    }

    // Upsert all settings
    for (const update of updates) {
      await prisma.systemSettings.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update integration settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
