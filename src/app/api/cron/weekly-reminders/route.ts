import { NextRequest, NextResponse } from "next/server";
import { runWeeklyReminders } from "@/lib/automation/engine";

// This endpoint should be called daily (e.g., 6:00 AM and 7:00 PM)
// It handles:
// - Morning email reminders for missing KPIs
// - Evening WhatsApp reminders for missing KPIs

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runWeeklyReminders();

    return NextResponse.json({
      success: true,
      message: "Weekly reminders processed",
    });
  } catch (error) {
    console.error("Weekly reminders cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

