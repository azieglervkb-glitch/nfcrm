import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Integration settings are managed via environment variables
// This endpoint returns masked values and status only

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

    // Get settings from environment variables
    const whatsappApiUrl = process.env.WHATSAPP_API_URL || "";
    const whatsappApiKey = process.env.WHATSAPP_API_KEY || "";
    const openaiApiKey = process.env.OPENAI_API_KEY || "";
    const copecartWebhookSecret = process.env.COPECART_WEBHOOK_SECRET || "";

    return NextResponse.json({
      whatsappApiUrl: whatsappApiUrl ? whatsappApiUrl : "",
      whatsappApiKey: whatsappApiKey ? "••••••••" : "",
      whatsappEnabled: !!whatsappApiUrl && !!whatsappApiKey,
      openaiApiKey: openaiApiKey ? "••••••••" : "",
      openaiEnabled: !!openaiApiKey,
      copecartWebhookSecret: copecartWebhookSecret ? "••••••••" : "",
      copecartEnabled: !!copecartWebhookSecret,
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

    // Integration settings are managed via environment variables
    // Changes require server restart - inform the user
    return NextResponse.json({
      success: false,
      message: "Integration settings are managed via environment variables. Please update the server configuration.",
    });
  } catch (error) {
    console.error("Failed to update integration settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
