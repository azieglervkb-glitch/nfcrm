
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();

  // Nur Admins können Debug-Infos sehen
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const memberEmail = searchParams.get("email") || searchParams.get("memberEmail");
    const memberId = searchParams.get("memberId");

    if (!memberEmail && !memberId) {
      return NextResponse.json(
        { error: "memberEmail or memberId required" },
        { status: 400 }
      );
    }

    // Find member
    const member = await prisma.member.findUnique({
      where: memberId ? { id: memberId } : { email: memberEmail! },
      include: {
        kpiWeeks: {
          orderBy: { weekStart: "desc" },
          take: 5, // Last 5 weeks
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get system settings
    const settings = await prisma.systemSettings.findFirst({
      where: { id: "default" },
    });

    // Check current week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const currentWeekKpi = member.kpiWeeks.find((kpi) => {
      const kpiWeekStart = new Date(kpi.weekStart);
      return kpiWeekStart.getTime() === weekStart.getTime();
    });

    // Check if send-feedback cronjob is running (check last execution)
    const lastCronRun = await prisma.automationLog.findFirst({
      where: {
        ruleId: "CRON_FEEDBACK",
      },
      orderBy: { firedAt: "desc" },
    });

    return NextResponse.json({
      member: {
        id: member.id,
        email: member.email,
        vorname: member.vorname,
        nachname: member.nachname,
        whatsappNummer: member.whatsappNummer,
      },
      currentWeek: currentWeekKpi
        ? {
            id: currentWeekKpi.id,
            weekStart: currentWeekKpi.weekStart.toISOString(),
            submittedAt: currentWeekKpi.submittedAt?.toISOString() || null,
            aiFeedbackGenerated: currentWeekKpi.aiFeedbackGenerated,
            aiFeedbackText: currentWeekKpi.aiFeedbackText,
            aiFeedbackGeneratedAt: currentWeekKpi.aiFeedbackGeneratedAt?.toISOString() || null,
            aiFeedbackBlocked: currentWeekKpi.aiFeedbackBlocked,
            aiFeedbackBlockReason: currentWeekKpi.aiFeedbackBlockReason,
            whatsappScheduledFor: currentWeekKpi.whatsappScheduledFor?.toISOString() || null,
            whatsappFeedbackSent: currentWeekKpi.whatsappFeedbackSent,
            whatsappSentAt: currentWeekKpi.whatsappSentAt?.toISOString() || null,
            isScheduledTimePassed:
              currentWeekKpi.whatsappScheduledFor
                ? new Date(currentWeekKpi.whatsappScheduledFor) <= now
                : false,
          }
        : null,
      settings: {
        aiFeedbackEnabled: settings?.aiFeedbackEnabled ?? true,
        aiFeedbackDelayMin: settings?.aiFeedbackDelayMin ?? 60,
        aiFeedbackDelayMax: settings?.aiFeedbackDelayMax ?? 120,
        aiFeedbackChannels: settings?.aiFeedbackChannels ?? ["WHATSAPP"],
        openaiApiKeyConfigured: !!process.env.OPENAI_API_KEY,
      },
      cronjobStatus: {
        lastRun: lastCronRun?.firedAt.toISOString() || null,
        lastRunActions: lastCronRun?.actionsTaken || [],
        minutesSinceLastRun: lastCronRun
          ? Math.floor((now.getTime() - lastCronRun.firedAt.getTime()) / 60000)
          : null,
      },
      diagnostics: {
        hasWhatsAppNumber: !!member.whatsappNummer,
        hasCurrentWeekKpi: !!currentWeekKpi,
        feedbackGenerated: currentWeekKpi?.aiFeedbackGenerated ?? false,
        feedbackBlocked: currentWeekKpi?.aiFeedbackBlocked ?? false,
        scheduledTimePassed:
          currentWeekKpi?.whatsappScheduledFor
            ? new Date(currentWeekKpi.whatsappScheduledFor) <= now
            : false,
        alreadySent: currentWeekKpi?.whatsappFeedbackSent ?? false,
      },
    });
  } catch (error) {
    console.error("Debug KPI feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

