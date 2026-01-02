import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekStart, getWeekInfo, getPreviousWeek } from "@/lib/date-utils";
import { sendKpiReminderEmail, sendKpiDeadlineReminderEmail } from "@/lib/email";
import { sendWhatsApp, isInQuietHours } from "@/lib/whatsapp";
import { generateFormUrl } from "@/lib/app-url";
import { randomBytes } from "crypto";
import { shouldRunKpiReminder, hasRunThisMinute } from "@/lib/cron-scheduler";
import { auth } from "@/lib/auth";

// This endpoint runs every minute and checks if it should execute based on settings
// Settings: kpiReminderDay1, kpiReminderTime1, kpiReminderDay2, kpiReminderTime2
// Supports force=true to bypass time check and send immediately
// Auth: CRON_SECRET for automated cron jobs, OR session auth for admin UI

const CRON_SECRET = process.env.CRON_SECRET;

// Helper to add random delay between sends
function randomDelay(maxSeconds: number): Promise<void> {
  const delay = Math.floor(Math.random() * maxSeconds * 1000);
  return new Promise(resolve => setTimeout(resolve, delay));
}

export async function GET(request: NextRequest) {
  // Check authentication: CRON_SECRET OR admin session
  const authHeader = request.headers.get("authorization");
  const isCronAuth = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;

  let isAdminAuth = false;
  if (!isCronAuth) {
    const session = await auth();
    isAdminAuth = !!session?.user;
  }

  if (!isCronAuth && !isAdminAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";
    const reminderTypeParam = searchParams.get("reminderType");

    // Get settings
    const settings = await prisma.systemSettings.findFirst({
      where: { id: "default" },
    });

    // Check if we should run based on settings (skip if force=true)
    let scheduleCheck;
    let reminderType: 1 | 2;

    if (force) {
      // Force mode: use reminderType from param or default to 1
      const forcedType = reminderTypeParam ? parseInt(reminderTypeParam) : 1;
      reminderType = (forcedType === 2 ? 2 : 1) as 1 | 2;
      scheduleCheck = {
        shouldRun: true,
        reminderType,
        reason: `Manual trigger (force=true, type=${reminderType})`
      };
    } else {
      scheduleCheck = await shouldRunKpiReminder();
      if (!scheduleCheck.shouldRun) {
        return NextResponse.json({
          skipped: true,
          reason: scheduleCheck.reason,
        });
      }
      reminderType = scheduleCheck.reminderType || 1;

      // Prevent duplicate runs within the same minute (only for automatic runs)
      if (await hasRunThisMinute("CRON", `KPI Reminder ${reminderType} Cron`)) {
        return NextResponse.json({
          skipped: true,
          reason: "Already ran this minute",
        });
      }
    }

    const deadlineTime = settings?.kpiTrackingWindowCloseTime || "20:00";
    const kpiReminderChannels = settings?.kpiReminderChannels || ["EMAIL"];

    // Reminder 1 (Friday): For the CURRENT week (still running)
    // Reminder 2 (Monday): For the PREVIOUS week (deadline reminder)
    const currentWeekStart = getCurrentWeekStart();
    const previousWeekStart = getPreviousWeek(currentWeekStart);

    // For reminder 1 (Friday), we remind about the current week
    // For reminder 2 (Monday), we remind about the previous week
    const targetWeekStart = reminderType === 1 ? currentWeekStart : previousWeekStart;
    const { weekNumber, year } = getWeekInfo(targetWeekStart);

    // Find active members who haven't submitted KPIs for the target week
    // Query by weekNumber and year for reliable matching (avoids timezone issues)
    const membersWithoutKpi = await prisma.member.findMany({
      where: {
        status: "AKTIV",
        kpiTrackingEnabled: true,
        kpiSetupCompleted: true, // Nur Members mit abgeschlossenem Setup
        kpiWeeks: {
          none: {
            weekNumber,
            year,
          },
        },
      },
      select: {
        id: true,
        email: true,
        vorname: true,
        whatsappNummer: true,
      },
    });

    const results = {
      total: membersWithoutKpi.length,
      emailsSent: 0,
      whatsappSent: 0,
      reminderType,
      forced: force,
      channels: kpiReminderChannels,
      errors: [] as string[],
    };

    const inQuietHours = await isInQuietHours();

    // Calculate max delay based on number of members (2s per member, max 60s)
    const maxDelaySeconds = Math.min(60, Math.max(5, membersWithoutKpi.length * 2));

    // Shuffle members for random order
    const shuffledMembers = [...membersWithoutKpi].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledMembers.length; i++) {
      const member = shuffledMembers[i];

      // Add random delay between sends (except first one)
      if (i > 0) {
        await randomDelay(maxDelaySeconds / shuffledMembers.length);
      }

      try {
        // Generate form token with weekStart to ensure correct week on submission
        const token = randomBytes(32).toString("hex");
        await prisma.formToken.create({
          data: {
            token,
            type: "weekly",
            memberId: member.id,
            weekStart: targetWeekStart, // Store which week this reminder is for
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });

        const formLink = generateFormUrl("weekly", token);

        // Send Email - different template for reminder 1 vs 2
        if (kpiReminderChannels.includes("EMAIL")) {
          let emailSent = false;
          if (reminderType === 1) {
            // Friday reminder - standard template for current week
            emailSent = await sendKpiReminderEmail(member, formLink, weekNumber);
          } else {
            // Monday reminder - deadline template with urgency
            emailSent = await sendKpiDeadlineReminderEmail(member, formLink, weekNumber, deadlineTime);
          }
          if (emailSent) results.emailsSent++;
        }

        // Send WhatsApp (if not in quiet hours, unless force mode)
        const shouldSendWhatsapp = member.whatsappNummer &&
          kpiReminderChannels.includes("WHATSAPP") &&
          (!inQuietHours || force);

        if (shouldSendWhatsapp && member.whatsappNummer) {
          let message: string;
          if (reminderType === 1) {
            // Friday reminder - for current week
            message = `Hey ${member.vorname}! 👋 Zeit für dein Weekly KPI-Update (KW${weekNumber})!\n\n${formLink}\n\nEs dauert nur 2 Minuten! 💪`;
          } else {
            // Monday reminder - deadline warning for previous week
            message = `⏰ Hey ${member.vorname}! Letzte Chance für KW${weekNumber}!\n\nDu hast noch bis heute ${deadlineTime} Uhr Zeit, deine KPIs einzutragen. Danach ist das Tracking geschlossen.\n\n${formLink}\n\nNimm dir jetzt 2 Minuten! 💪`;
          }

          const whatsappSent = await sendWhatsApp({
            phone: member.whatsappNummer,
            message,
            memberId: member.id,
            type: "REMINDER",
            ruleId: force ? "MANUAL_TRIGGER" : "CRON",
          });

          if (whatsappSent) {
            results.whatsappSent++;
          }
        }
      } catch (error) {
        results.errors.push(`${member.email}: ${error}`);
      }
    }

    // Log the cron run
    await prisma.automationLog.create({
      data: {
        ruleId: force ? "MANUAL_TRIGGER" : "CRON",
        ruleName: force ? `KPI Reminder ${reminderType} Manual` : `KPI Reminder ${reminderType} Cron`,
        triggered: true,
        actionsTaken: [
          `Reminder ${reminderType} for KW${weekNumber}`,
          `${results.emailsSent} Emails sent`,
          `${results.whatsappSent} WhatsApp messages sent`,
          force ? "Manually triggered" : "Scheduled run",
        ],
        details: results,
      },
    });

    return NextResponse.json({
      success: true,
      message: `KPI reminder ${reminderType} sent for KW${weekNumber}`,
      results,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support POST for some cron services
export async function POST(request: NextRequest) {
  return GET(request);
}
