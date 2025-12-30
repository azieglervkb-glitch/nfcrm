import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendWhatsApp } from "@/lib/whatsapp";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const kpiWeek = await prisma.kpiWeek.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            vorname: true,
            whatsappNummer: true,
          },
        },
      },
    });

    if (!kpiWeek || !kpiWeek.member) {
      return NextResponse.json({ error: "KPI not found" }, { status: 404 });
    }

    // Check if feedback exists
    if (!kpiWeek.aiFeedbackText) {
      return NextResponse.json(
        {
          error: "no_feedback",
          message: "Kein KI-Feedback vorhanden. Bitte zuerst Feedback generieren.",
        },
        { status: 400 }
      );
    }

    // Check if already sent
    if (kpiWeek.whatsappFeedbackSent) {
      return NextResponse.json(
        {
          error: "already_sent",
          message: "WhatsApp-Feedback wurde bereits gesendet.",
        },
        { status: 400 }
      );
    }

    // Check if member has WhatsApp number
    if (!kpiWeek.member.whatsappNummer) {
      return NextResponse.json(
        {
          error: "no_whatsapp",
          message: "Member hat keine WhatsApp-Nummer hinterlegt.",
        },
        { status: 400 }
      );
    }

    // Claim the KPI to prevent race conditions
    const claimed = await prisma.kpiWeek.updateMany({
      where: {
        id: kpiWeek.id,
        whatsappFeedbackSent: false,
      },
      data: {
        whatsappFeedbackSent: true,
        whatsappSentAt: new Date(),
      },
    });

    if (claimed.count === 0) {
      return NextResponse.json(
        {
          error: "already_sent",
          message: "WhatsApp-Feedback wurde bereits gesendet.",
        },
        { status: 400 }
      );
    }

    // Send WhatsApp immediately (ignore quiet hours - admin explicitly wants to send now)
    const sent = await sendWhatsApp({
      phone: kpiWeek.member.whatsappNummer,
      message: kpiWeek.aiFeedbackText,
      memberId: kpiWeek.member.id,
      type: "FEEDBACK",
    });

    if (!sent) {
      // Revert if sending failed
      await prisma.kpiWeek.update({
        where: { id: kpiWeek.id },
        data: {
          whatsappFeedbackSent: false,
          whatsappSentAt: null,
        },
      });

      return NextResponse.json(
        {
          error: "send_failed",
          message: "WhatsApp-Nachricht konnte nicht gesendet werden.",
        },
        { status: 500 }
      );
    }

    // Clear scheduled time and get updated record
    const updated = await prisma.kpiWeek.update({
      where: { id: kpiWeek.id },
      data: {
        whatsappScheduledFor: null,
      },
      select: {
        id: true,
        weekNumber: true,
        year: true,
        aiFeedbackText: true,
        aiFeedbackGeneratedAt: true,
        whatsappScheduledFor: true,
        whatsappFeedbackSent: true,
        whatsappSentAt: true,
      },
    });

    // Log the action
    await prisma.automationLog.create({
      data: {
        memberId: kpiWeek.member.id,
        ruleId: "AI_FEEDBACK_SEND_NOW",
        ruleName: "AI Feedback Sofort Gesendet",
        triggered: true,
        actionsTaken: ["SEND_WHATSAPP_FEEDBACK_NOW"],
        details: {
          kpiWeekId: kpiWeek.id,
          weekNumber: kpiWeek.weekNumber,
          year: kpiWeek.year,
          sentBy: session.user.email || session.user.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `WhatsApp-Feedback an ${kpiWeek.member.vorname} gesendet.`,
      kpiWeek: {
        ...updated,
        aiFeedbackGeneratedAt: updated.aiFeedbackGeneratedAt?.toISOString() || null,
        whatsappScheduledFor: null,
        whatsappSentAt: updated.whatsappSentAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Send feedback now error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
