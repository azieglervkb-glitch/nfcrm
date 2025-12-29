import { NextRequest, NextResponse } from "next/server";
import { sendOnboardingReminders } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { shouldCronRun } from "@/lib/cron-scheduler";

/**
 * Cronjob: Send Onboarding Reminders
 * Runs at configured time (default: daily at 10:00)
 * Sends reminders to members who haven't completed onboarding
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if this cron should run now (dynamic scheduling)
  const cronKey = "onboardingReminders";
  const runCheck = await shouldCronRun(cronKey);
  
  if (!runCheck.shouldRun) {
    return NextResponse.json({ 
      skipped: true, 
      reason: runCheck.reason,
      nextRun: runCheck.nextRun 
    });
  }

  try {
    const result = await sendOnboardingReminders();

    // Log execution
    await prisma.automationLog.create({
      data: {
        ruleId: "CRON",
        ruleName: "Onboarding Reminders Cron",
        triggered: result.reminded > 0,
        actionsTaken: [
          `PROCESSED: ${result.processed}`,
          `REMINDED: ${result.reminded}`,
          `SKIPPED: ${result.skipped}`,
          ...(result.errors.length > 0 ? [`ERRORS: ${result.errors.length}`] : []),
        ],
        details: result,
      },
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Onboarding reminders cron error:", error);
    return NextResponse.json(
      { error: "Failed to send onboarding reminders" },
      { status: 500 }
    );
  }
}

