import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateKpiFeedback, hasDataAnomaly } from "@/lib/openai";
import { runKpiAutomations } from "@/lib/automation/engine";
import { createFeedbackBlockTask } from "@/lib/feedback-block-helper";

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getCurrentWeekStart(): Date {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        vorname: true,
        nachname: true,
        trackKontakte: true,
        trackTermine: true,
        trackEinheiten: true,
        trackEmpfehlungen: true,
        trackEntscheider: true,
        trackAbschluesse: true,
        umsatzSollWoche: true,
        kontakteSoll: true,
        entscheiderSoll: true,
        termineVereinbartSoll: true,
        termineStattgefundenSoll: true,
        termineAbschlussSoll: true,
        einheitenSoll: true,
        empfehlungenSoll: true,
        kpiWeeks: {
          orderBy: { weekStart: "desc" },
          take: 12,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const weekStart = getCurrentWeekStart();

    const currentWeek = member.kpiWeeks.find((entry) => {
      const entryWeek = new Date(entry.weekStart);
      return entryWeek.getTime() === weekStart.getTime();
    });

    // History (exclude current week)
    const history = member.kpiWeeks
      .filter((entry) => {
        const entryWeek = new Date(entry.weekStart);
        return entryWeek.getTime() !== weekStart.getTime();
      })
      .map((entry) => ({
        weekStart: entry.weekStart.toISOString(),
        weekNumber: entry.weekNumber,
        umsatzIst: entry.umsatzIst ? Number(entry.umsatzIst) : null,
        kontakteIst: entry.kontakteIst,
        feelingScore: entry.feelingScore,
      }));

    return NextResponse.json({
      member: {
        vorname: member.vorname,
        nachname: member.nachname,
        trackKontakte: member.trackKontakte,
        trackTermine: member.trackTermine,
        trackEinheiten: member.trackEinheiten,
        trackEmpfehlungen: member.trackEmpfehlungen,
        trackEntscheider: member.trackEntscheider,
        trackAbschluesse: member.trackAbschluesse,
        umsatzSollWoche: member.umsatzSollWoche ? Number(member.umsatzSollWoche) : null,
        kontakteSoll: member.kontakteSoll,
        entscheiderSoll: member.entscheiderSoll,
        termineVereinbartSoll: member.termineVereinbartSoll,
        termineStattgefundenSoll: member.termineStattgefundenSoll,
        termineAbschlussSoll: member.termineAbschlussSoll,
        einheitenSoll: member.einheitenSoll,
        empfehlungenSoll: member.empfehlungenSoll,
      },
      currentWeek: currentWeek
        ? {
            id: currentWeek.id,
            umsatzIst: currentWeek.umsatzIst ? Number(currentWeek.umsatzIst) : null,
            kontakteIst: currentWeek.kontakteIst,
            entscheiderIst: currentWeek.entscheiderIst,
            termineVereinbartIst: currentWeek.termineVereinbartIst,
            termineStattgefundenIst: currentWeek.termineStattgefundenIst,
            termineAbschlussIst: currentWeek.termineAbschlussIst,
            termineNoshowIst: currentWeek.termineNoshowIst,
            einheitenIst: currentWeek.einheitenIst,
            empfehlungenIst: currentWeek.empfehlungenIst,
            feelingScore: currentWeek.feelingScore,
            heldentat: currentWeek.heldentat,
            blockiert: currentWeek.blockiert,
            herausforderung: currentWeek.herausforderung,
          }
        : null,
      history,
    });
  } catch (error) {
    console.error("Failed to fetch KPI data:", error);
    return NextResponse.json(
      { error: "Failed to fetch KPI data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      memberId,
      umsatzIst,
      kontakteIst,
      entscheiderIst,
      termineVereinbartIst,
      termineStattgefundenIst,
      termineAbschlussIst,
      termineNoshowIst,
      einheitenIst,
      empfehlungenIst,
      feelingScore,
      heldentat,
      blockiert,
      herausforderung,
    } = body;

    if (!memberId) {
      return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const weekStart = getCurrentWeekStart();
    const weekNumber = getWeekNumber(weekStart);
    const year = weekStart.getFullYear();

    // Check if already submitted this week - no edits allowed
    const existingKpi = await prisma.kpiWeek.findUnique({
      where: {
        memberId_weekStart: {
          memberId,
          weekStart,
        },
      },
    });

    if (existingKpi) {
      return NextResponse.json(
        { error: "already_submitted", message: "KPIs wurden bereits eingereicht" },
        { status: 400 }
      );
    }

    // Create KPI entry (no updates allowed)
    const kpiWeek = await prisma.kpiWeek.create({
      data: {
        memberId,
        weekStart,
        weekNumber,
        year,
        umsatzIst,
        kontakteIst,
        entscheiderIst,
        termineVereinbartIst,
        termineStattgefundenIst,
        termineAbschlussIst,
        termineNoshowIst,
        einheitenIst,
        empfehlungenIst,
        feelingScore,
        heldentat,
        blockiert,
        herausforderung,
        submittedAt: new Date(),
      },
    });

    // Check for data anomalies
    const anomalyCheck = hasDataAnomaly(kpiWeek);

    if (anomalyCheck.hasAnomaly) {
      // Block AI feedback and flag for review
      await prisma.kpiWeek.update({
        where: { id: kpiWeek.id },
        data: {
          aiFeedbackBlocked: true,
          aiFeedbackBlockReason: anomalyCheck.reason,
        },
      });

      await prisma.member.update({
        where: { id: memberId },
        data: { reviewFlag: true },
      });

      // Create task for review
      await createFeedbackBlockTask(kpiWeek.id, memberId, (anomalyCheck.reason || "Daten-Anomalie"), "Q2");

      await prisma.automationLog.create({
        data: {
          memberId,
          ruleId: "Q2",
          ruleName: "Daten-Anomalie",
          actionsTaken: ["BLOCK_AI_FEEDBACK", "SET_FLAG: reviewFlag", "CREATE_TASK: Review"],
          details: { reason: anomalyCheck.reason, kpiWeekId: kpiWeek.id },
        },
      });
    } else {
      // Generate AI feedback (async, don't wait)
      generateAiFeedbackAsync(kpiWeek.id, member, kpiWeek).catch(console.error);
    }

    // Run automation rules (async, don't wait)
    runKpiAutomations(memberId, kpiWeek.id).catch(console.error);

    return NextResponse.json({ success: true, kpiWeek });
  } catch (error) {
    console.error("Failed to save KPI data:", error);
    return NextResponse.json(
      { error: "Failed to save KPI data" },
      { status: 500 }
    );
  }
}

async function generateAiFeedbackAsync(
  kpiWeekId: string,
  member: any,
  kpiWeek: any
) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      const reason = "OpenAI API Key nicht konfiguriert";
      await prisma.kpiWeek.update({
        where: { id: kpiWeekId },
        data: {
          aiFeedbackBlocked: true,
          aiFeedbackBlockReason: reason,
        },
      });
      // Create task for admin to configure API key
      await createFeedbackBlockTask(kpiWeekId, member.id, reason, "FEEDBACK_BLOCK");
      console.error("OpenAI API Key not configured");
      return;
    }

    // Generate feedback
    const { text, style } = await generateKpiFeedback(member, kpiWeek);

    // Get delay settings
    const settings = await prisma.systemSettings.findFirst({
      where: { id: "default" },
    });

    const delayMin = settings?.aiFeedbackDelayMin ?? 60;
    const delayMax = settings?.aiFeedbackDelayMax ?? 120;

    // Calculate random delay between min and max
    const delayMinutes = delayMin + Math.random() * (delayMax - delayMin);
    const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);

    // Save feedback with scheduled send time
    await prisma.kpiWeek.update({
      where: { id: kpiWeekId },
      data: {
        aiFeedbackGenerated: true,
        aiFeedbackText: text,
        aiFeedbackStyle: style,
        aiFeedbackGeneratedAt: new Date(),
        whatsappScheduledFor: member.whatsappNummer ? scheduledFor : null,
      },
    });

    console.log(`AI feedback generated for KPI ${kpiWeekId}, scheduled for ${scheduledFor.toISOString()} (delay: ${Math.round(delayMinutes)} min)`);
  } catch (error: any) {
    // Store the error so it's visible in the UI
    const errorMessage = error?.message || "Unbekannter Fehler bei KI-Feedback-Generierung";
    const reason = `OpenAI Fehler: ${errorMessage.substring(0, 200)}`;
    console.error("Error generating AI feedback:", error);

    await prisma.kpiWeek.update({
      where: { id: kpiWeekId },
      data: {
        aiFeedbackBlocked: true,
        aiFeedbackBlockReason: reason,
      },
    });

    // Create task for admin to review the error
    await createFeedbackBlockTask(kpiWeekId, member.id, reason, "FEEDBACK_BLOCK");
  }
}
