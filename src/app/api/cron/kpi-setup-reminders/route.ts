import { NextRequest, NextResponse } from "next/server";
import { checkKpiSetupReminders } from "@/lib/kpi-tracking";
import { hasRunThisMinute } from "@/lib/cron-scheduler";

/**
 * Cronjob endpoint for KPI setup reminders
 * Should run every minute (via crontab)
 * Internally checks if reminders should be sent based on settings
 */
export async function GET(request: NextRequest) {
  try {
    // Prevent duplicate runs within the same minute
    if (await hasRunThisMinute("CRON", "KPI Setup Reminders")) {
      return NextResponse.json({
        skipped: true,
        reason: "Already ran this minute",
      });
    }

    await checkKpiSetupReminders();

    return NextResponse.json({
      success: true,
      message: "KPI setup reminders checked",
    });
  } catch (error) {
    console.error("KPI setup reminders cron error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
