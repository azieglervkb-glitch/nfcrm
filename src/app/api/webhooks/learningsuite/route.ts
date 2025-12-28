import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activateKpiTracking, syncMemberWithLearninSuite } from "@/lib/kpi-tracking";
import { syncMemberWithLearninSuite as syncLearninSuite } from "@/lib/learningsuite";

/**
 * LearninSuite Webhook Endpoint
 * Receives notifications when users complete modules
 * 
 * Expected payload:
 * {
 *   event: "module.completed",
 *   user: { id: string, email: string },
 *   module: number,
 *   completedAt: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, user, module: moduleNumber, completedAt } = body;

    // Verify webhook signature if configured
    const webhookSecret = process.env.LEARNINSUITE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get("x-learningsuite-signature");
      // TODO: Implement signature verification
    }

    // Only handle module completion events
    if (event !== "module.completed") {
      return NextResponse.json({ received: true, ignored: true });
    }

    if (!user?.email || !moduleNumber) {
      return NextResponse.json(
        { error: "Missing user email or module number" },
        { status: 400 }
      );
    }

    // Find member by email
    const member = await prisma.member.findUnique({
      where: { email: user.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        vorname: true,
        onboardingCompleted: true,
        kpiTrackingEnabled: true,
        kpiSetupCompleted: true,
        learningSuiteUserId: true,
        currentModule: true,
      },
    });

    if (!member) {
      console.log(`LearninSuite webhook: Member not found for email ${user.email}`);
      return NextResponse.json({ received: true, memberNotFound: true });
    }

    // Sync LearninSuite data
    const syncResult = await syncLearninSuite(member.email);
    if (syncResult.synced) {
      await prisma.member.update({
        where: { id: member.id },
        data: {
          learningSuiteUserId: syncResult.learningSuiteUserId || member.learningSuiteUserId,
          currentModule: syncResult.currentModule,
          learningSuiteLastSync: new Date(),
        },
      });
    }

    // Get settings to check trigger requirements
    const settings = await prisma.systemSettings.findFirst({
      where: { id: "default" },
    });

    const triggerSource = settings?.kpiTriggerSource || "manual";
    const triggerModule = settings?.kpiTriggerModule || 2;

    // Only auto-activate if LearninSuite trigger is enabled
    if (triggerSource === "learningsuite_api" || triggerSource === "both") {
      // Check if module requirement is met
      const currentModule = syncResult.currentModule || moduleNumber;
      if (currentModule >= triggerModule) {
        // Try to activate KPI tracking
        const activationResult = await activateKpiTracking(member.id, "learningsuite_api");

        if (activationResult.activated) {
          await prisma.automationLog.create({
            data: {
              memberId: member.id,
              ruleId: "LEARNINSUITE_WEBHOOK",
              ruleName: "LearninSuite Module Completed",
              triggered: true,
              actionsTaken: [
                "SYNC_LEARNINSUITE_DATA",
                "ACTIVATE_KPI_TRACKING",
                "SEND_KPI_SETUP_EMAIL",
              ],
              details: {
                module: moduleNumber,
                currentModule,
                triggerModule,
                completedAt,
                activationResult,
              },
            },
          });

          return NextResponse.json({
            received: true,
            activated: true,
            memberId: member.id,
          });
        } else {
          // Log why activation was skipped
          await prisma.automationLog.create({
            data: {
              memberId: member.id,
              ruleId: "LEARNINSUITE_WEBHOOK",
              ruleName: "LearninSuite Module Completed (Skipped)",
              triggered: true,
              actionsTaken: ["SYNC_LEARNINSUITE_DATA", "SKIP_KPI_ACTIVATION"],
              details: {
                module: moduleNumber,
                currentModule,
                triggerModule,
                reason: activationResult.reason,
              },
            },
          });
        }
      }
    }

    return NextResponse.json({
      received: true,
      synced: true,
      memberId: member.id,
    });
  } catch (error) {
    console.error("LearninSuite webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

