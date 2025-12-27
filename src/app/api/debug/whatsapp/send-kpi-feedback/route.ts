import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isInQuietHours, sendWhatsApp } from "@/lib/whatsapp";

/**
 * Admin-only manual test endpoint:
 * - Sends a pending KPI feedback immediately via WhatsApp
 *
 * Query params:
 * - kpiWeekId: string (optional)
 * - memberId: string (optional, used if kpiWeekId not provided)
 * - force: "true" | "false" (optional; if true, ignores quiet hours + schedule)
 *
 * Notes:
 * - This is intended for manual testing / debugging.
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const kpiWeekId = searchParams.get("kpiWeekId") || undefined;
    const memberId = searchParams.get("memberId") || undefined;
    const force = (searchParams.get("force") || "false").toLowerCase() === "true";

    if (!kpiWeekId && !memberId) {
      return NextResponse.json(
        { error: "kpiWeekId or memberId is required" },
        { status: 400 }
      );
    }

    const now = new Date();

    // Load KPI week to send
    const kpiWeek = kpiWeekId
      ? await prisma.kpiWeek.findUnique({
          where: { id: kpiWeekId },
          include: {
            member: {
              select: { id: true, vorname: true, whatsappNummer: true },
            },
          },
        })
      : await prisma.kpiWeek.findFirst({
          where: {
            memberId: memberId!,
            whatsappFeedbackSent: false,
            aiFeedbackGenerated: true,
            aiFeedbackBlocked: false,
            aiFeedbackText: { not: null },
          },
          orderBy: { weekStart: "desc" },
          include: {
            member: {
              select: { id: true, vorname: true, whatsappNummer: true },
            },
          },
        });

    if (!kpiWeek || !kpiWeek.member) {
      return NextResponse.json(
        { error: "No eligible KPI feedback found" },
        { status: 404 }
      );
    }

    if (!kpiWeek.aiFeedbackText) {
      return NextResponse.json(
        { error: "KPI has no aiFeedbackText" },
        { status: 400 }
      );
    }

    if (!kpiWeek.member.whatsappNummer) {
      return NextResponse.json(
        { error: "Member has no WhatsApp number configured" },
        { status: 400 }
      );
    }

    if (kpiWeek.whatsappFeedbackSent) {
      return NextResponse.json(
        { error: "WhatsApp feedback already sent for this KPI" },
        { status: 400 }
      );
    }

    // Respect quiet hours unless forced
    const quietHours = await isInQuietHours();
    if (quietHours && !force) {
      return NextResponse.json(
        {
          error: "quiet_hours",
          message: "Quiet Hours aktiv – setze force=true um trotzdem zu senden.",
        },
        { status: 409 }
      );
    }

    // Send immediately
    const sent = await sendWhatsApp({
      phone: kpiWeek.member.whatsappNummer,
      message: kpiWeek.aiFeedbackText,
      memberId: kpiWeek.member.id,
      type: "FEEDBACK",
      ruleId: "MANUAL_TEST",
    });

    if (sent) {
      await prisma.kpiWeek.update({
        where: { id: kpiWeek.id },
        data: {
          whatsappFeedbackSent: true,
          whatsappSentAt: now,
          whatsappScheduledFor: null,
        },
      });

      await prisma.automationLog.create({
        data: {
          memberId: kpiWeek.member.id,
          ruleId: "MANUAL_WHATSAPP_TEST",
          ruleName: "Manual WhatsApp KPI Feedback Test",
          triggered: true,
          actionsTaken: ["SEND_WHATSAPP: KPI Feedback (manual)"],
          details: {
            kpiWeekId: kpiWeek.id,
            forced: force,
          },
        },
      });
    }

    return NextResponse.json({
      success: sent,
      forced: force,
      member: {
        id: kpiWeek.member.id,
        vorname: kpiWeek.member.vorname,
        whatsappNummer: kpiWeek.member.whatsappNummer,
      },
      kpiWeek: {
        id: kpiWeek.id,
        weekStart: kpiWeek.weekStart.toISOString(),
        whatsappFeedbackSent: sent ? true : kpiWeek.whatsappFeedbackSent,
      },
    });
  } catch (error) {
    console.error("Manual WhatsApp send error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}


