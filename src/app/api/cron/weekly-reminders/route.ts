import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// DEPRECATED: This endpoint is disabled
// ============================================================================
// Reason: This old reminder system sends URLs with member.id instead of tokens,
// which causes the form submit button to be disabled (preview mode).
//
// Use /api/cron/kpi-reminder instead - it:
// - Creates proper form tokens
// - Runs at configurable times (Settings: kpiReminderDay1/2, kpiReminderTime1/2)
// - Handles both Friday (current week) and Monday (previous week deadline) reminders
// ============================================================================

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return success without doing anything - this endpoint is deprecated
  return NextResponse.json({
    success: true,
    message: "DEPRECATED: This endpoint is disabled. Use /api/cron/kpi-reminder instead.",
    deprecated: true,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
