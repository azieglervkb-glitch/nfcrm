/**
 * Onboarding Trigger Logic
 *
 * Handles the decision of when to send onboarding based on LearningSuite progress:
 * - New members: Wait for specific lesson completion
 * - Existing members (Module 2+): Start immediately
 */

import { prisma } from "@/lib/prisma";
import { syncMemberWithLearninSuite, getMemberProgressByEmail } from "@/lib/learningsuite";
import { sendOnboardingInviteEmail } from "@/lib/email";
import { sendWhatsApp, isInQuietHours } from "@/lib/whatsapp";
import { generateFormUrl } from "@/lib/app-url";
import { randomBytes } from "crypto";

export interface OnboardingTriggerResult {
  status: "waiting_for_lesson" | "triggered" | "skipped_existing" | "already_sent" | "error";
  actions: string[];
  formLink?: string;
  reason?: string;
}

/**
 * Check and potentially trigger onboarding for a member
 * Call this when a member is created or synced with LearningSuite
 */
export async function checkAndTriggerOnboarding(
  memberId: string,
  options: {
    forceSync?: boolean;
    triggeredBy?: string;
  } = {}
): Promise<OnboardingTriggerResult> {
  const actions: string[] = [];

  try {
    // Get member with all relevant fields
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        email: true,
        vorname: true,
        nachname: true,
        whatsappNummer: true,
        onboardingCompleted: true,
        onboardingSentAt: true,
        onboardingTriggerStatus: true,
        currentModule: true,
        learningSuiteUserId: true,
      },
    });

    if (!member) {
      return { status: "error", actions: ["ERROR: Member not found"], reason: "Member not found" };
    }

    // Already completed onboarding
    if (member.onboardingCompleted) {
      actions.push("SKIP: Onboarding already completed");
      return { status: "already_sent", actions, reason: "Onboarding already completed" };
    }

    // Already sent onboarding
    if (member.onboardingSentAt) {
      actions.push("SKIP: Onboarding already sent");
      return { status: "already_sent", actions, reason: "Onboarding already sent" };
    }

    // Get settings
    const settings = await prisma.systemSettings.findFirst({
      where: { id: "default" },
    });

    const triggerEnabled = settings?.onboardingTriggerEnabled ?? false;
    const existingMemberModule = settings?.onboardingExistingMemberModule ?? 2;

    // If trigger is not enabled, just send onboarding immediately
    if (!triggerEnabled) {
      actions.push("INFO: Onboarding trigger disabled, sending immediately");
      return await sendOnboardingToMember(memberId, options.triggeredBy || "manual", actions);
    }

    // Sync with LearningSuite to get current progress
    let currentModule = member.currentModule;

    if (options.forceSync || !currentModule) {
      actions.push("SYNC: LearningSuite");
      const syncResult = await syncMemberWithLearninSuite(member.email);

      if (syncResult.synced) {
        currentModule = syncResult.currentModule;
        await prisma.member.update({
          where: { id: memberId },
          data: {
            learningSuiteUserId: syncResult.learningSuiteUserId || undefined,
            currentModule: syncResult.currentModule,
            learningSuiteLastSync: new Date(),
          },
        });
        actions.push(`UPDATE: currentModule = ${currentModule}`);
      } else {
        actions.push("WARN: LearningSuite sync failed, using cached data");
      }
    }

    // Check if member is "existing" (has progress beyond threshold)
    const isExistingMember = currentModule !== null && currentModule >= existingMemberModule;

    if (isExistingMember) {
      // Existing member: trigger onboarding immediately
      actions.push(`INFO: Existing member (Module ${currentModule} >= ${existingMemberModule})`);

      await prisma.member.update({
        where: { id: memberId },
        data: {
          onboardingTriggerStatus: "skipped_existing",
          onboardingTriggeredAt: new Date(),
          onboardingTriggeredBy: "existing_member",
          importedWithProgress: true,
        },
      });

      return await sendOnboardingToMember(memberId, "existing_member", actions);
    } else {
      // New member: set to waiting for lesson
      actions.push(`INFO: New member (Module ${currentModule ?? 0} < ${existingMemberModule})`);
      actions.push("SET: onboardingTriggerStatus = waiting_for_lesson");

      await prisma.member.update({
        where: { id: memberId },
        data: {
          onboardingTriggerStatus: "waiting_for_lesson",
        },
      });

      return {
        status: "waiting_for_lesson",
        actions,
        reason: `Waiting for trigger lesson (current module: ${currentModule ?? 0})`,
      };
    }
  } catch (error) {
    console.error("[checkAndTriggerOnboarding] Error:", error);
    actions.push(`ERROR: ${error instanceof Error ? error.message : "Unknown error"}`);
    return { status: "error", actions, reason: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Send onboarding email and WhatsApp to a member
 */
async function sendOnboardingToMember(
  memberId: string,
  triggeredBy: string,
  actions: string[]
): Promise<OnboardingTriggerResult> {
  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        email: true,
        vorname: true,
        nachname: true,
        whatsappNummer: true,
      },
    });

    if (!member) {
      actions.push("ERROR: Member not found");
      return { status: "error", actions, reason: "Member not found" };
    }

    // Create form token
    const token = randomBytes(32).toString("hex");
    await prisma.formToken.create({
      data: {
        token,
        type: "onboarding",
        memberId: member.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
    actions.push("CREATE: FormToken");

    const formLink = generateFormUrl("onboarding", token);

    // Send Email
    const emailSent = await sendOnboardingInviteEmail(member, formLink);
    if (emailSent) {
      actions.push("SEND: Onboarding Email");
    } else {
      actions.push("FAIL: Onboarding Email");
    }

    // Send WhatsApp (if not in quiet hours)
    const inQuietHours = await isInQuietHours();
    if (member.whatsappNummer && !inQuietHours) {
      const message = `Hey ${member.vorname}! 🎉 Willkommen beim NF Mentoring!\n\nBitte fülle kurz dein Onboarding-Formular aus, damit wir dich optimal betreuen können:\n${formLink}\n\nDauert nur 2-3 Minuten! 💪`;

      const whatsappSent = await sendWhatsApp({
        phone: member.whatsappNummer,
        message,
        memberId: member.id,
        type: "REMINDER",
        ruleId: "ONBOARDING_TRIGGER",
      });

      if (whatsappSent) {
        actions.push("SEND: WhatsApp");
      } else {
        actions.push("FAIL: WhatsApp");
      }
    } else if (inQuietHours) {
      actions.push("SKIP: WhatsApp (quiet hours)");
    } else {
      actions.push("SKIP: WhatsApp (no number)");
    }

    // Update member
    await prisma.member.update({
      where: { id: memberId },
      data: {
        onboardingSentAt: new Date(),
        onboardingTriggerStatus: "triggered",
        onboardingTriggeredAt: new Date(),
        onboardingTriggeredBy: triggeredBy,
      },
    });
    actions.push("UPDATE: onboardingSentAt");

    // Log automation
    await prisma.automationLog.create({
      data: {
        memberId,
        ruleId: "ONBOARDING_TRIGGER",
        ruleName: "Onboarding Trigger",
        triggered: true,
        actionsTaken: actions,
        details: { triggeredBy, formLink },
      },
    });

    return {
      status: "triggered",
      actions,
      formLink,
    };
  } catch (error) {
    console.error("[sendOnboardingToMember] Error:", error);
    actions.push(`ERROR: ${error instanceof Error ? error.message : "Unknown error"}`);
    return { status: "error", actions, reason: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Manually trigger onboarding for a member (admin action)
 */
export async function manuallyTriggerOnboarding(memberId: string): Promise<OnboardingTriggerResult> {
  const actions: string[] = ["MANUAL: Admin triggered onboarding"];

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      onboardingCompleted: true,
      onboardingSentAt: true,
    },
  });

  if (!member) {
    return { status: "error", actions: ["ERROR: Member not found"], reason: "Member not found" };
  }

  if (member.onboardingCompleted) {
    actions.push("SKIP: Already completed");
    return { status: "already_sent", actions, reason: "Onboarding already completed" };
  }

  if (member.onboardingSentAt) {
    actions.push("SKIP: Already sent");
    return { status: "already_sent", actions, reason: "Onboarding already sent" };
  }

  return await sendOnboardingToMember(memberId, "manual", actions);
}

/**
 * Cron fallback: Check members waiting for lessons who might have been missed
 */
export async function checkPendingOnboardings(): Promise<{
  checked: number;
  triggered: number;
  results: Array<{ memberId: string; result: OnboardingTriggerResult }>;
}> {
  const results: Array<{ memberId: string; result: OnboardingTriggerResult }> = [];

  // Find members waiting for lesson trigger for more than 7 days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  const pendingMembers = await prisma.member.findMany({
    where: {
      onboardingTriggerStatus: "waiting_for_lesson",
      onboardingSentAt: null,
      createdAt: { lt: cutoffDate },
    },
    select: {
      id: true,
      email: true,
    },
  });

  console.log(`[checkPendingOnboardings] Found ${pendingMembers.length} pending members`);

  for (const member of pendingMembers) {
    // Re-check their LearningSuite progress
    const result = await checkAndTriggerOnboarding(member.id, {
      forceSync: true,
      triggeredBy: "cron_fallback",
    });

    results.push({ memberId: member.id, result });
  }

  return {
    checked: pendingMembers.length,
    triggered: results.filter((r) => r.result.status === "triggered").length,
    results,
  };
}

/**
 * Get onboarding trigger status for display
 */
export function getOnboardingTriggerStatusDisplay(status: string | null): {
  label: string;
  color: "gray" | "yellow" | "green" | "blue";
} {
  switch (status) {
    case "waiting_for_lesson":
      return { label: "Wartet auf Lesson", color: "yellow" };
    case "triggered":
      return { label: "Ausgelöst", color: "green" };
    case "skipped_existing":
      return { label: "Bestandskunde", color: "blue" };
    default:
      return { label: "Nicht konfiguriert", color: "gray" };
  }
}
