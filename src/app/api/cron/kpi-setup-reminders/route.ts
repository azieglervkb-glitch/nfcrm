import { NextRequest, NextResponse } from "next/server";
import { checkKpiSetupReminders } from "@/lib/kpi-tracking";
import { shouldCronRun, hasRunThisMinute } from "@/lib/cron-scheduler";
import { prisma } from "@/lib/prisma";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cronjob endpoint for KPI setup reminders
 * Should run every minute (via crontab)
 * Internally checks if it's 10:30 and sends reminders if needed
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if this cron should run now (10:30 daily)
    const runCheck = await shouldCronRun("kpiSetupReminders");

    if (!runCheck.shouldRun) {
      return NextResponse.json({
        skipped: true,
        reason: runCheck.reason,
      });
    }

    // Prevent duplicate runs within the same minute
    if (await hasRunThisMinute("CRON", "KPI Setup Reminders")) {
      return NextResponse.json({
        skipped: true,
        reason: "Already ran this minute",
      });
    }

    // Get count of pending members before running
    const settings = await prisma.systemSettings.findFirst({
      where: { id: "default" },
    });
    const reminderDays = settings?.kpiSetupReminderDays || [1, 3, 7];

    const pendingBefore = await prisma.member.count({
      where: {
        kpiTrackingEnabled: true,
        kpiSetupCompleted: false,
        kpiSetupReminderCount: { lt: reminderDays.length },
      },
    });

    // Run the reminders
    await checkKpiSetupReminders();

    // Get count after to determine how many were reminded
    const pendingAfter = await prisma.member.count({
      where: {
        kpiTrackingEnabled: true,
        kpiSetupCompleted: false,
        kpiSetupReminderCount: { lt: reminderDays.length },
      },
    });

    const remindersProcessed = pendingBefore - pendingAfter;

    // Log the execution
    await prisma.automationLog.create({
      data: {
        ruleId: "CRON",
        ruleName: "KPI Setup Reminders",
        triggered: true, // Always true when it runs at scheduled time
        actionsTaken: [
          `Geprüft: ${pendingBefore} Members ohne KPI-Setup`,
          `Erinnert: ${remindersProcessed} Members`,
        ],
        details: {
          pendingBefore,
          pendingAfter,
          remindersProcessed,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "KPI setup reminders checked",
      pendingMembers: pendingBefore,
      remindersProcessed,
    });
  } catch (error) {
    console.error("KPI setup reminders cron error:", error);

    // Log the error
    await prisma.automationLog.create({
      data: {
        ruleId: "CRON",
        ruleName: "KPI Setup Reminders",
        triggered: false,
        actionsTaken: ["Fehler beim Ausführen"],
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      },
    }).catch(() => {}); // Ignore logging errors

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
