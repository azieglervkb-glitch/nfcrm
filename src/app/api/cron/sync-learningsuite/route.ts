import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncMemberWithLearninSuite } from "@/lib/learningsuite";
import { activateKpiTracking } from "@/lib/kpi-tracking";
import { hasRunThisMinute } from "@/lib/cron-scheduler";

/**
 * Cronjob endpoint for syncing members with LearninSuite
 * Should run every hour (via crontab)
 * Syncs progress and auto-activates KPI tracking if conditions are met
 */
export async function GET(request: NextRequest) {
  try {
    // Prevent duplicate runs within the same minute
    if (await hasRunThisMinute("CRON", "LearninSuite Sync")) {
      return NextResponse.json({
        skipped: true,
        reason: "Already ran this minute",
      });
    }

    const settings = await prisma.systemSettings.findFirst({
      where: { id: "default" },
    });

    const triggerSource = settings?.kpiTriggerSource || "manual";
    const triggerModule = settings?.kpiTriggerModule || 2;

    // Only sync if LearninSuite is enabled
    if (triggerSource === "manual") {
      return NextResponse.json({
        success: true,
        message: "LearninSuite sync disabled (manual mode)",
      });
    }

    // Find ALL active members who have completed onboarding
    // We need to sync LearningSuite progress for everyone, not just those waiting for KPI setup
    const eligibleMembers = await prisma.member.findMany({
      where: {
        status: "AKTIV",
        onboardingCompleted: true,
      },
      select: {
        id: true,
        email: true,
        vorname: true,
        learningSuiteUserId: true,
        currentModule: true,
        kpiTrackingEnabled: true,
        kpiSetupCompleted: true,
      },
    });

    let synced = 0;
    let activated = 0;
    let errors = 0;

    for (const member of eligibleMembers) {
      try {
        // Sync with LearninSuite
        const syncResult = await syncMemberWithLearninSuite(member.email!);

        if (syncResult.synced) {
          // Update member with LearninSuite data
          await prisma.member.update({
            where: { id: member.id },
            data: {
              learningSuiteUserId: syncResult.learningSuiteUserId || member.learningSuiteUserId,
              currentModule: syncResult.currentModule,
              learningSuiteLastSync: new Date(),
            },
          });
          synced++;

          // Check if module requirement is met AND KPI tracking not yet enabled
          if (
            syncResult.currentModule &&
            syncResult.currentModule >= triggerModule &&
            !member.kpiTrackingEnabled &&
            !member.kpiSetupCompleted
          ) {
            // Try to activate KPI tracking
            const activationResult = await activateKpiTracking(member.id, "learningsuite_api");

            if (activationResult.activated) {
              activated++;
            }
          }
        }
      } catch (error) {
        console.error(`Error syncing member ${member.id}:`, error);
        errors++;
      }
    }

    // Log sync run
    await prisma.automationLog.create({
      data: {
        memberId: eligibleMembers[0]?.id || "system",
        ruleId: "LEARNINSUITE_SYNC",
        ruleName: "LearninSuite Sync Cronjob",
        triggered: true,
        actionsTaken: ["SYNC_LEARNINSUITE", "CHECK_KPI_ACTIVATION"],
        details: {
          totalMembers: eligibleMembers.length,
          synced,
          activated,
          errors,
          triggerModule,
        },
      },
    }).catch((error) => {
      console.error("Failed to create automation log:", error);
    });

    return NextResponse.json({
      success: true,
      message: "LearninSuite sync completed",
      stats: {
        total: eligibleMembers.length,
        synced,
        activated,
        errors,
      },
    });
  } catch (error) {
    console.error("LearninSuite sync cron error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

