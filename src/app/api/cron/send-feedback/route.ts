import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp, isInQuietHours } from "@/lib/whatsapp";

// This endpoint should be called by an external cron service every 5 minutes
// It sends scheduled WhatsApp feedback messages when their scheduled time arrives

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

    const results = {
      processed: 0,
      sent: 0,
      skippedQuietHours: 0,
      skippedNoNumber: 0,
      errors: [] as string[],
    };

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

    for (const kpi of pendingFeedback) {
      results.processed++;

      if (!kpi.member.whatsappNummer) {
        // No WhatsApp number, clear schedule so it won't retry
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
        // Reschedule to next available time (8:00 AM + random 0-60 min delay)
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);

        // Add random delay (0-60 minutes) so messages don't all arrive at exactly 8:00
        const randomDelayMinutes = Math.floor(Math.random() * 60);
        tomorrow.setMinutes(randomDelayMinutes);

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
        // IMPORTANT: Claim this KPI first with atomic update to prevent race conditions
        // Only update if whatsappFeedbackSent is still false (prevents duplicate sends)
        const claimed = await prisma.kpiWeek.updateMany({
          where: {
            id: kpi.id,
            whatsappFeedbackSent: false, // Only claim if not already sent/claimed
          },
          data: {
            whatsappFeedbackSent: true, // Mark as sent BEFORE actually sending
            whatsappSentAt: new Date(),
          },
        });

        // If no rows were updated, another process already claimed this KPI
        if (claimed.count === 0) {
          continue; // Skip - already being processed by another instance
        }

        // Now send the WhatsApp message
        const sent = await sendWhatsApp({
          phone: kpi.member.whatsappNummer,
          message: kpi.aiFeedbackText!,
          memberId: kpi.member.id,
          type: "FEEDBACK",
        });

        if (sent) {
          // Clear the schedule (already marked as sent above)
          // Note: sendWhatsApp() already logs to CommunicationLog, no need to log again
          await prisma.kpiWeek.update({
            where: { id: kpi.id },
            data: {
              whatsappScheduledFor: null,
            },
          });

          results.sent++;
        } else {
          // Sending failed - revert the claim so it can be retried
          await prisma.kpiWeek.update({
            where: { id: kpi.id },
            data: {
              whatsappFeedbackSent: false,
              whatsappSentAt: null,
            },
          });
          results.errors.push(`Failed to send to ${kpi.member.vorname}`);
        }
      } catch (error) {
        // On error, revert the claim so it can be retried
        await prisma.kpiWeek.update({
          where: { id: kpi.id },
          data: {
            whatsappFeedbackSent: false,
            whatsappSentAt: null,
          },
        }).catch(() => {}); // Ignore revert errors
        results.errors.push(`${kpi.member.vorname}: ${error}`);
      }
    }

    // Always log the cron run (even if processed=0)
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
        details: { ...results, quietHours, pendingFound: pendingFeedback.length },
      },
    });

    if (pendingFeedback.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending feedback to send",
        processed: 0,
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
