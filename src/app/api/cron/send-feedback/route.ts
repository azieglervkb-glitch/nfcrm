import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp, isInQuietHours } from "@/lib/whatsapp";

// This endpoint should be called by an external cron service every 5 minutes
// It sends scheduled WhatsApp feedback messages when their scheduled time arrives
//
// Example: cron-job.org, Railway Cron, or VPS crontab
// Recommended: */5 * * * * (every 5 minutes)

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const quietHours = await isInQuietHours();

    // Find KPI weeks with scheduled feedback that's due
    const pendingFeedback = await prisma.kpiWeek.findMany({
      where: {
        whatsappScheduledFor: {
          lte: now, // Scheduled time has passed
        },
        whatsappFeedbackSent: false,
        aiFeedbackGenerated: true,
        aiFeedbackBlocked: false,
        aiFeedbackText: {
          not: null,
        },
      },
      include: {
        member: {
          select: {
            id: true,
            vorname: true,
            whatsappNummer: true,
          },
        },
      },
      take: 20, // Process max 20 at a time to avoid timeouts
    });

    if (pendingFeedback.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending feedback to send",
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      sent: 0,
      skippedQuietHours: 0,
      skippedNoNumber: 0,
      errors: [] as string[],
    };

    for (const kpi of pendingFeedback) {
      results.processed++;

      if (!kpi.member.whatsappNummer) {
        // No WhatsApp number, mark as done
        await prisma.kpiWeek.update({
          where: { id: kpi.id },
          data: {
            whatsappScheduledFor: null,
          },
        });
        results.skippedNoNumber++;
        continue;
      }

      if (quietHours) {
        // Reschedule to next available time (8:00 AM)
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);

        await prisma.kpiWeek.update({
          where: { id: kpi.id },
          data: {
            whatsappScheduledFor: tomorrow,
          },
        });
        results.skippedQuietHours++;
        continue;
      }

      try {
        const sent = await sendWhatsApp({
          phone: kpi.member.whatsappNummer,
          message: kpi.aiFeedbackText!,
          memberId: kpi.member.id,
          type: "FEEDBACK",
        });

        if (sent) {
          await prisma.kpiWeek.update({
            where: { id: kpi.id },
            data: {
              whatsappFeedbackSent: true,
              whatsappSentAt: new Date(),
              whatsappScheduledFor: null,
            },
          });

          // Log communication
          await prisma.communicationLog.create({
            data: {
              memberId: kpi.member.id,
              channel: "WHATSAPP",
              type: "FEEDBACK",
              content: kpi.aiFeedbackText!,
              recipient: kpi.member.whatsappNummer,
              sent: true,
              sentAt: new Date(),
            },
          });

          results.sent++;
        } else {
          results.errors.push(`Failed to send to ${kpi.member.vorname}`);
        }
      } catch (error) {
        results.errors.push(`${kpi.member.vorname}: ${error}`);
      }
    }

    // Log the cron run if any messages were processed
    if (results.processed > 0) {
      await prisma.automationLog.create({
        data: {
          ruleId: "CRON_FEEDBACK",
          ruleName: "Scheduled Feedback Sender",
          triggered: true,
          actionsTaken: [
            `${results.sent} feedback messages sent`,
            `${results.skippedQuietHours} rescheduled (quiet hours)`,
            `${results.skippedNoNumber} skipped (no WhatsApp)`,
          ],
          details: results,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} pending feedback`,
      results,
    });
  } catch (error) {
    console.error("Send feedback cron error:", error);
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
