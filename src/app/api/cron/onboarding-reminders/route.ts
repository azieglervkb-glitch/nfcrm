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

    // Log execution - triggered=true means job ran successfully (even if nothing to remind)
    await prisma.automationLog.create({
      data: {
        ruleId: "CRON",
        ruleName: "Onboarding Reminders Cron",
        triggered: true, // Job ran successfully
        actionsTaken: [
          `Geprüft: ${result.processed} Members`,
          `Erinnert: ${result.reminded} Members`,
          `Übersprungen: ${result.skipped}`,
          ...(result.errors.length > 0 ? [`Fehler: ${result.errors.length}`] : []),
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

    // Log the error
    await prisma.automationLog.create({
      data: {
        ruleId: "CRON",
        ruleName: "Onboarding Reminders Cron",
        triggered: false, // Job failed
        actionsTaken: ["Fehler beim Ausführen"],
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      },
    }).catch(() => {}); // Ignore logging errors

    return NextResponse.json(
      { error: "Failed to send onboarding reminders" },
      { status: 500 }
    );
  }
}

