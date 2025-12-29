import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateKpiFeedback, hasDataAnomaly } from "@/lib/openai";
import { runKpiAutomations } from "@/lib/automation/engine";
import { createFeedbackBlockTask } from "@/lib/feedback-block-helper";
import { getCurrentWeekStart, getPreviousWeek, getWeekInfo, getWeekRangeString } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const weekStartParam = searchParams.get("weekStart");

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
        trackKonvertierung: true,
        trackAbschlussquote: true,
        umsatzSollWoche: true,
        kontakteSoll: true,
        entscheiderSoll: true,
        termineVereinbartSoll: true,
        termineStattgefundenSoll: true,
        termineAbschlussSoll: true,
        einheitenSoll: true,
        empfehlungenSoll: true,
        konvertierungTerminSoll: true,
        abschlussquoteSoll: true,
        kpiWeeks: {
          orderBy: { weekStart: "desc" },
          take: 12,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Calculate available weeks for selection (only previous and current week)
    const currentWeekMonday = getCurrentWeekStart();
    const previousWeek = getPreviousWeek(currentWeekMonday);

    // Check if previous week was already submitted
    const previousWeekEntry = member.kpiWeeks.find((entry) => {
      const entryWeek = new Date(entry.weekStart);
      return entryWeek.getTime() === previousWeek.getTime();
    });
    const previousWeekSubmitted = !!previousWeekEntry?.id;

    const availableWeeks = [
      {
        weekStart: previousWeek.toISOString(),
        label: `KW${getWeekInfo(previousWeek).weekNumber} (${getWeekRangeString(previousWeek)})`,
        weekNumber: getWeekInfo(previousWeek).weekNumber,
        isDefault: !previousWeekSubmitted, // Only default if not already submitted
        alreadySubmitted: previousWeekSubmitted,
      },
      {
        weekStart: currentWeekMonday.toISOString(),
        label: `KW${getWeekInfo(currentWeekMonday).weekNumber} (${getWeekRangeString(currentWeekMonday)})`,
        weekNumber: getWeekInfo(currentWeekMonday).weekNumber,
        isDefault: previousWeekSubmitted, // Default to current week if previous is done
        alreadySubmitted: false,
      },
    ];

    // Use provided weekStart or smart default (current week if previous is submitted)
    const weekStart = weekStartParam
      ? new Date(weekStartParam)
      : previousWeekSubmitted ? currentWeekMonday : previousWeek;

    const currentWeek = member.kpiWeeks.find((entry) => {
      const entryWeek = new Date(entry.weekStart);
      return entryWeek.getTime() === weekStart.getTime();
    });

    // History (exclude selected week) - return all tracked values
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
        entscheiderIst: entry.entscheiderIst,
        termineVereinbartIst: entry.termineVereinbartIst,
        termineStattgefundenIst: entry.termineStattgefundenIst,
        termineErstIst: entry.termineErstIst,
        termineFolgeIst: entry.termineFolgeIst,
        termineAbschlussIst: entry.termineAbschlussIst,
        termineNoshowIst: entry.termineNoshowIst,
        einheitenIst: entry.einheitenIst,
        empfehlungenIst: entry.empfehlungenIst,
        konvertierungTerminIst: entry.konvertierungTerminIst ? Number(entry.konvertierungTerminIst) : null,
        abschlussquoteIst: entry.abschlussquoteIst ? Number(entry.abschlussquoteIst) : null,
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
        trackKonvertierung: member.trackKonvertierung,
        trackAbschlussquote: member.trackAbschlussquote,
        umsatzSollWoche: member.umsatzSollWoche ? Number(member.umsatzSollWoche) : null,
        kontakteSoll: member.kontakteSoll,
        entscheiderSoll: member.entscheiderSoll,
        termineVereinbartSoll: member.termineVereinbartSoll,
        termineStattgefundenSoll: member.termineStattgefundenSoll,
        termineAbschlussSoll: member.termineAbschlussSoll,
        einheitenSoll: member.einheitenSoll,
        empfehlungenSoll: member.empfehlungenSoll,
        konvertierungTerminSoll: member.konvertierungTerminSoll ? Number(member.konvertierungTerminSoll) : null,
        abschlussquoteSoll: member.abschlussquoteSoll ? Number(member.abschlussquoteSoll) : null,
      },
      availableWeeks,
      selectedWeekStart: weekStart.toISOString(),
      currentWeek: currentWeek
        ? {
            id: currentWeek.id,
            umsatzIst: currentWeek.umsatzIst ? Number(currentWeek.umsatzIst) : null,
            kontakteIst: currentWeek.kontakteIst,
            entscheiderIst: currentWeek.entscheiderIst,
            termineVereinbartIst: currentWeek.termineVereinbartIst,
            termineStattgefundenIst: currentWeek.termineStattgefundenIst,
            termineErstIst: currentWeek.termineErstIst,
            termineFolgeIst: currentWeek.termineFolgeIst,
            termineAbschlussIst: currentWeek.termineAbschlussIst,
            termineNoshowIst: currentWeek.termineNoshowIst,
            einheitenIst: currentWeek.einheitenIst,
            empfehlungenIst: currentWeek.empfehlungenIst,
            konvertierungTerminIst: currentWeek.konvertierungTerminIst ? Number(currentWeek.konvertierungTerminIst) : null,
            abschlussquoteIst: currentWeek.abschlussquoteIst ? Number(currentWeek.abschlussquoteIst) : null,
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
      weekStart: weekStartParam,
      umsatzIst,
      kontakteIst,
      entscheiderIst,
      termineVereinbartIst,
      termineStattgefundenIst,
      termineErstIst,
      termineFolgeIst,
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

    // Use provided weekStart or default to previous week
    const weekStart = weekStartParam
      ? new Date(weekStartParam)
      : getPreviousWeek(getCurrentWeekStart());
    const { weekNumber, year } = getWeekInfo(weekStart);

    // Check if already submitted for this week - no edits allowed
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

    // Calculate konvertierungTerminIst and abschlussquoteIst
    let konvertierungTerminIst = null;
    if (kontakteIst && termineVereinbartIst && kontakteIst > 0) {
      konvertierungTerminIst = (termineVereinbartIst / kontakteIst) * 100;
    }

    let abschlussquoteIst = null;
    if (termineStattgefundenIst && termineAbschlussIst && termineStattgefundenIst > 0) {
      abschlussquoteIst = (termineAbschlussIst / termineStattgefundenIst) * 100;
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
        termineErstIst,
        termineFolgeIst,
        termineAbschlussIst,
        termineNoshowIst,
        einheitenIst,
        empfehlungenIst,
        konvertierungTerminIst,
        abschlussquoteIst,
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
