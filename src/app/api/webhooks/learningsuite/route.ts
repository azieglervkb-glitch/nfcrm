import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncMemberWithLearninSuite } from "@/lib/learningsuite";
import { sendOnboardingInviteEmail } from "@/lib/email";
import { sendWhatsApp, isInQuietHours } from "@/lib/whatsapp";
import { generateFormUrl } from "@/lib/app-url";
import { randomBytes } from "crypto";

/**
 * LearningSuite Webhook Endpoint
 * Handles lesson.completed and courseProgress.changed events
 *
 * lesson.completed payload:
 * {
 *   fromUser: { id, email, firstName, lastName, fullName },
 *   lesson: { id, name },
 *   module: { id, name },
 *   course: { id, name }
 * }
 */

// Types for LearningSuite webhook payloads
interface LessonCompletedPayload {
  fromUser: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
  };
  lesson: {
    id: string;
    name: string;
  };
  module: {
    id: string;
    name: string;
  };
  course: {
    id: string;
    name: string;
  };
}

interface CourseProgressChangedPayload {
  fromUser: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  course: {
    id: string;
    name: string;
  };
  currentProgress: number;
}

export async function POST(request: NextRequest) {
  try {
    // Get event type from header (LearningSuite sends this)
    const eventType = request.headers.get("x-learningsuite-event") || "unknown";
    const body = await request.json();

    console.log(`[LearningSuite Webhook] Event: ${eventType}`);
    console.log(`[LearningSuite Webhook] Payload:`, JSON.stringify(body, null, 2));

    // Verify webhook signature if configured
    const webhookSecret = process.env.LEARNINGSUITE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get("x-learningsuite-signature");
      // TODO: Implement HMAC signature verification
      // For now, just log if signature is present
      if (signature) {
        console.log(`[LearningSuite Webhook] Signature present: ${signature.substring(0, 20)}...`);
      }
    }

    // Route to appropriate handler based on event type
    switch (eventType) {
      case "lesson.completed":
        return await handleLessonCompleted(body as LessonCompletedPayload);

      case "courseProgress.changed":
        return await handleCourseProgressChanged(body as CourseProgressChangedPayload);

      // Legacy support for old format
      case "module.completed":
      case "unknown":
        // Try to detect format from payload
        if (body.fromUser && body.lesson) {
          return await handleLessonCompleted(body as LessonCompletedPayload);
        } else if (body.user && body.module) {
          // Old format - convert to new
          return await handleLegacyModuleCompleted(body);
        }
        console.log(`[LearningSuite Webhook] Unhandled event type: ${eventType}`);
        return NextResponse.json({ received: true, ignored: true });

      default:
        console.log(`[LearningSuite Webhook] Unknown event type: ${eventType}`);
        return NextResponse.json({ received: true, ignored: true });
    }
  } catch (error) {
    console.error("[LearningSuite Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Handle lesson.completed event
 * This is the main handler for triggering onboarding
 */
async function handleLessonCompleted(payload: LessonCompletedPayload) {
  const { fromUser, lesson, module, course } = payload;

  if (!fromUser?.email) {
    console.log("[LearningSuite Webhook] Missing user email");
    return NextResponse.json({ received: true, error: "Missing user email" }, { status: 400 });
  }

  // Find member by email
  const member = await prisma.member.findUnique({
    where: { email: fromUser.email.toLowerCase() },
    select: {
      id: true,
      email: true,
      vorname: true,
      nachname: true,
      whatsappNummer: true,
      onboardingCompleted: true,
      onboardingSentAt: true,
      onboardingTriggerStatus: true,
      learningSuiteUserId: true,
      currentModule: true,
    },
  });

  if (!member) {
    console.log(`[LearningSuite Webhook] Member not found for email: ${fromUser.email}`);
    return NextResponse.json({ received: true, memberNotFound: true });
  }

  console.log(`[LearningSuite Webhook] Found member: ${member.vorname} ${member.nachname} (${member.id})`);

  // Get settings
  const settings = await prisma.systemSettings.findFirst({
    where: { id: "default" },
  });

  const triggerEnabled = settings?.onboardingTriggerEnabled ?? false;
  const triggerLessonId = settings?.onboardingTriggerLessonId;
  const triggerCourseId = settings?.onboardingTriggerCourseId;

  // Update member's LearningSuite data
  await prisma.member.update({
    where: { id: member.id },
    data: {
      learningSuiteUserId: fromUser.id,
      learningSuiteLastSync: new Date(),
    },
  });

  // Check if this is the trigger lesson
  const isTrigggerLesson = triggerEnabled &&
    triggerLessonId &&
    lesson.id === triggerLessonId &&
    (!triggerCourseId || course.id === triggerCourseId);

  if (isTrigggerLesson) {
    console.log(`[LearningSuite Webhook] TRIGGER LESSON completed: ${lesson.name}`);

    // Check if member is waiting for trigger
    if (member.onboardingTriggerStatus === "waiting_for_lesson") {
      // Trigger onboarding!
      const result = await triggerOnboarding(member.id, "lesson_webhook", {
        lessonId: lesson.id,
        lessonName: lesson.name,
        moduleId: module.id,
        moduleName: module.name,
        courseId: course.id,
        courseName: course.name,
      });

      await prisma.automationLog.create({
        data: {
          memberId: member.id,
          ruleId: "LEARNINGSUITE_LESSON_TRIGGER",
          ruleName: "LearningSuite Lesson Trigger",
          triggered: true,
          actionsTaken: result.actions,
          details: {
            lessonId: lesson.id,
            lessonName: lesson.name,
            moduleName: module.name,
            result,
          },
        },
      });

      return NextResponse.json({
        received: true,
        onboardingTriggered: true,
        memberId: member.id,
        result,
      });
    } else {
      console.log(`[LearningSuite Webhook] Member not waiting for trigger (status: ${member.onboardingTriggerStatus})`);
    }
  }

  // Log the lesson completion for tracking
  await prisma.automationLog.create({
    data: {
      memberId: member.id,
      ruleId: "LEARNINGSUITE_LESSON",
      ruleName: "LearningSuite Lesson Completed",
      triggered: true,
      actionsTaken: ["SYNC_MEMBER_DATA"],
      details: {
        lessonId: lesson.id,
        lessonName: lesson.name,
        moduleName: module.name,
        courseName: course.name,
        isTriggerLesson: isTrigggerLesson,
      },
    },
  });

  return NextResponse.json({
    received: true,
    synced: true,
    memberId: member.id,
  });
}

/**
 * Handle courseProgress.changed event
 */
async function handleCourseProgressChanged(payload: CourseProgressChangedPayload) {
  const { fromUser, course, currentProgress } = payload;

  if (!fromUser?.email) {
    return NextResponse.json({ received: true, error: "Missing user email" }, { status: 400 });
  }

  const member = await prisma.member.findUnique({
    where: { email: fromUser.email.toLowerCase() },
    select: { id: true, email: true },
  });

  if (!member) {
    return NextResponse.json({ received: true, memberNotFound: true });
  }

  // Sync full member data
  const syncResult = await syncMemberWithLearninSuite(member.email);

  if (syncResult.synced) {
    await prisma.member.update({
      where: { id: member.id },
      data: {
        learningSuiteUserId: syncResult.learningSuiteUserId || undefined,
        currentModule: syncResult.currentModule,
        learningSuiteLastSync: new Date(),
      },
    });
  }

  console.log(`[LearningSuite Webhook] Progress updated for ${member.email}: ${currentProgress}%`);

  return NextResponse.json({
    received: true,
    synced: syncResult.synced,
    memberId: member.id,
    progress: currentProgress,
  });
}

/**
 * Handle legacy module.completed format (backwards compatibility)
 */
async function handleLegacyModuleCompleted(body: {
  event?: string;
  user?: { id?: string; email?: string };
  module?: number;
  completedAt?: string;
}) {
  const { user, module: moduleNumber } = body;

  if (!user?.email || !moduleNumber) {
    return NextResponse.json({ received: true, error: "Missing data" }, { status: 400 });
  }

  const member = await prisma.member.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, email: true },
  });

  if (!member) {
    return NextResponse.json({ received: true, memberNotFound: true });
  }

  // Sync and update
  const syncResult = await syncMemberWithLearninSuite(member.email);

  if (syncResult.synced) {
    await prisma.member.update({
      where: { id: member.id },
      data: {
        learningSuiteUserId: syncResult.learningSuiteUserId || user.id,
        currentModule: syncResult.currentModule ?? moduleNumber,
        learningSuiteLastSync: new Date(),
      },
    });
  }

  return NextResponse.json({
    received: true,
    synced: true,
    memberId: member.id,
    legacyFormat: true,
  });
}

/**
 * Trigger onboarding for a member
 */
async function triggerOnboarding(
  memberId: string,
  triggeredBy: string,
  details: Record<string, unknown>
): Promise<{ success: boolean; actions: string[]; formLink?: string }> {
  const actions: string[] = [];

  try {
    // Get member data
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        email: true,
        vorname: true,
        nachname: true,
        whatsappNummer: true,
        onboardingSentAt: true,
      },
    });

    if (!member) {
      return { success: false, actions: ["ERROR: Member not found"] };
    }

    // Check if onboarding was already sent
    if (member.onboardingSentAt) {
      actions.push("SKIP: Onboarding already sent");
      await prisma.member.update({
        where: { id: memberId },
        data: {
          onboardingTriggerStatus: "triggered",
          onboardingTriggeredAt: new Date(),
          onboardingTriggeredBy: triggeredBy,
        },
      });
      return { success: true, actions };
    }

    // Update trigger status
    await prisma.member.update({
      where: { id: memberId },
      data: {
        onboardingTriggerStatus: "triggered",
        onboardingTriggeredAt: new Date(),
        onboardingTriggeredBy: triggeredBy,
      },
    });
    actions.push("UPDATE: onboardingTriggerStatus = triggered");

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
        ruleId: "LEARNINGSUITE_TRIGGER",
      });

      if (whatsappSent) {
        actions.push("SEND: WhatsApp");
      }
    } else if (inQuietHours) {
      actions.push("SKIP: WhatsApp (quiet hours)");
    }

    // Update onboardingSentAt
    await prisma.member.update({
      where: { id: memberId },
      data: { onboardingSentAt: new Date() },
    });
    actions.push("UPDATE: onboardingSentAt");

    return { success: true, actions, formLink };
  } catch (error) {
    console.error("[triggerOnboarding] Error:", error);
    actions.push(`ERROR: ${error instanceof Error ? error.message : "Unknown error"}`);
    return { success: false, actions };
  }
}

// GET endpoint for webhook verification (some services require this)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge");

  if (challenge) {
    // Return challenge for webhook verification
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({
    status: "ok",
    endpoint: "LearningSuite Webhook",
    supportedEvents: ["lesson.completed", "courseProgress.changed", "module.completed (legacy)"],
  });
}
