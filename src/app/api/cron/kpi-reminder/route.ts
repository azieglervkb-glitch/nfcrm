import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekStart, getWeekInfo } from "@/lib/date-utils";
import { sendKpiReminderEmail } from "@/lib/email";
import { sendWhatsApp, isInQuietHours } from "@/lib/whatsapp";
import { randomBytes } from "crypto";
import { shouldRunKpiReminder, hasRunThisMinute } from "@/lib/cron-scheduler";

// This endpoint runs every minute and checks if it should execute based on settings
// Settings: kpiReminderDay1, kpiReminderTime1, kpiReminderDay2, kpiReminderTime2

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if we should run based on settings
    const scheduleCheck = await shouldRunKpiReminder();
    if (!scheduleCheck.shouldRun) {
      return NextResponse.json({
        skipped: true,
        reason: scheduleCheck.reason,
      });
    }

    // Prevent duplicate runs within the same minute
    if (await hasRunThisMinute("CRON", "KPI Reminder Cron")) {
      return NextResponse.json({
        skipped: true,
        reason: "Already ran this minute",
      });
    }
    const weekStart = getCurrentWeekStart();
    const { weekNumber } = getWeekInfo(weekStart);

    // Find active members who haven't submitted KPIs this week
    const membersWithoutKpi = await prisma.member.findMany({
      where: {
        status: "AKTIV",
        kpiTrackingActive: true,
        kpiWeeks: {
          none: {
            weekStart,
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
      errors: [] as string[],
    };

    const inQuietHours = await isInQuietHours();

    for (const member of membersWithoutKpi) {
      try {
        // Generate form token
        const token = randomBytes(32).toString("hex");
        await prisma.formToken.create({
          data: {
            token,
            type: "weekly",
            memberId: member.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });

        const formLink = `${process.env.APP_URL || "http://localhost:3000"}/form/weekly/${token}`;

        // Send Email
        const emailSent = await sendKpiReminderEmail(member, formLink, weekNumber);
        if (emailSent) results.emailsSent++;

        // Send WhatsApp (if not in quiet hours)
        if (member.whatsappNummer && !inQuietHours) {
          const message = `Hey ${member.vorname}! 👋 Deine KPIs für diese Woche (KW${weekNumber}) fehlen noch. Hier ist dein Link:\n${formLink}\n\nEs dauert nur 2 Minuten! 💪`;

          const whatsappSent = await sendWhatsApp({
            phone: member.whatsappNummer,
            message,
            memberId: member.id,
            type: "REMINDER",
            ruleId: "CRON",
          });

          if (whatsappSent) {
            results.whatsappSent++;
            // Note: Communication already logged by sendWhatsApp function
          }
        }
      } catch (error) {
        results.errors.push(`${member.email}: ${error}`);
      }
    }

    // Log the cron run
    await prisma.automationLog.create({
      data: {
        ruleId: "CRON",
        ruleName: "KPI Reminder Cron",
        triggered: true,
        actionsTaken: [
          `${results.emailsSent} Emails sent`,
          `${results.whatsappSent} WhatsApp messages sent`,
        ],
        details: results,
      },
    });

    return NextResponse.json({
      success: true,
      message: `KPI reminders sent for KW${weekNumber}`,
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
