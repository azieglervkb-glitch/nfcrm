import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { weeklyKpiFormSchema } from "@/lib/validations";
import { getCurrentWeekStart, getPreviousWeek, getWeekInfo, getWeekRangeString, normalizeWeekStart } from "@/lib/date-utils";
import { generateKpiFeedback, hasDataAnomaly } from "@/lib/openai";
import { runKpiAutomations } from "@/lib/automation/engine";
import { createFeedbackBlockTask } from "@/lib/feedback-block-helper";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // First try to find a FormToken
  const formToken = await prisma.formToken.findUnique({
    where: { token },
    include: { member: true },
  });

  if (formToken) {
    if (formToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "Token abgelaufen" }, { status: 400 });
    }

    if (formToken.type !== "weekly") {
      return NextResponse.json({ error: "Ungültiger Token-Typ" }, { status: 400 });
    }

    // Get member with KPI weeks to check submissions
    const member = await prisma.member.findUnique({
      where: { id: formToken.memberId },
      include: {
        kpiWeeks: {
          orderBy: { weekStart: "desc" },
          take: 12,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member nicht gefunden" }, { status: 404 });
    }

    // Calculate available weeks for selection (only previous and current week)
    const currentWeekMonday = getCurrentWeekStart();
    const previousWeek = getPreviousWeek(currentWeekMonday);

    // Check if previous week was already submitted
    // Normalize dates to avoid timezone issues
    const normalizedPreviousWeek = normalizeWeekStart(previousWeek);
    const previousWeekEntry = member.kpiWeeks.find((entry) => {
      const entryWeek = normalizeWeekStart(new Date(entry.weekStart));
      return entryWeek.getTime() === normalizedPreviousWeek.getTime();
    });
    const previousWeekSubmitted = !!previousWeekEntry?.id;

    // Check if current week was already submitted
    const normalizedCurrentWeek = normalizeWeekStart(currentWeekMonday);
    const currentWeekEntry = member.kpiWeeks.find((entry) => {
      const entryWeek = normalizeWeekStart(new Date(entry.weekStart));
      return entryWeek.getTime() === normalizedCurrentWeek.getTime();
    });
    const currentWeekSubmitted = !!currentWeekEntry?.id;

    // Build available weeks array
    // Only show weeks that are NOT submitted, UNLESS both are submitted (then show both for editing)
    const availableWeeks = [];

    // Add previous week if: not submitted OR both are submitted
    if (!previousWeekSubmitted || (previousWeekSubmitted && currentWeekSubmitted)) {
      availableWeeks.push({
        weekStart: previousWeek.toISOString(),
        label: `KW${getWeekInfo(previousWeek).weekNumber} (${getWeekRangeString(previousWeek)})`,
        weekNumber: getWeekInfo(previousWeek).weekNumber,
        isDefault: !previousWeekSubmitted && !currentWeekSubmitted, // Default if neither is submitted
        alreadySubmitted: previousWeekSubmitted,
      });
    }

    // Add current week if: not submitted OR both are submitted
    if (!currentWeekSubmitted || (previousWeekSubmitted && currentWeekSubmitted)) {
      availableWeeks.push({
        weekStart: currentWeekMonday.toISOString(),
        label: `KW${getWeekInfo(currentWeekMonday).weekNumber} (${getWeekRangeString(currentWeekMonday)})`,
        weekNumber: getWeekInfo(currentWeekMonday).weekNumber,
        isDefault: previousWeekSubmitted && !currentWeekSubmitted, // Default if previous is done but current is not
        alreadySubmitted: currentWeekSubmitted,
      });
    }

    // Use weekStart from token if available, otherwise smart default
    let selectedWeekStart: string;
    if (formToken.weekStart) {
      selectedWeekStart = formToken.weekStart.toISOString();
    } else if (previousWeekSubmitted && !currentWeekSubmitted) {
      selectedWeekStart = currentWeekMonday.toISOString();
    } else if (availableWeeks.length > 0) {
      // Use the first available week (which should be the default)
      selectedWeekStart = availableWeeks.find((w) => w.isDefault)?.weekStart || availableWeeks[0].weekStart;
    } else {
      // Fallback to previous week if no weeks available (shouldn't happen)
      selectedWeekStart = previousWeek.toISOString();
    }

    return NextResponse.json({
      member: {
        id: member.id,
        vorname: member.vorname,
        nachname: member.nachname,
        trackKontakte: member.trackKontakte,
        trackTermine: member.trackTermine,
        trackEinheiten: member.trackEinheiten,
        trackEmpfehlungen: member.trackEmpfehlungen,
        trackEntscheider: member.trackEntscheider,
        trackAbschluesse: member.trackAbschluesse,
        umsatzSollWoche: member.umsatzSollWoche,
        kontakteSoll: member.kontakteSoll,
        termineVereinbartSoll: member.termineVereinbartSoll,
        termineAbschlussSoll: member.termineAbschlussSoll,
        einheitenSoll: member.einheitenSoll,
        empfehlungenSoll: member.empfehlungenSoll,
      },
      availableWeeks,
      selectedWeekStart,
      isPreview: false,
    });
  }

  // If no token found, try to find by member ID (for admin preview)
  const member = await prisma.member.findUnique({
    where: { id: token },
    include: {
      kpiWeeks: {
        orderBy: { weekStart: "desc" },
        take: 12,
      },
    },
  });

  if (member) {
    // Calculate available weeks for selection (only previous and current week)
    const currentWeekMonday = getCurrentWeekStart();
    const previousWeek = getPreviousWeek(currentWeekMonday);

    // Check if previous week was already submitted
    // Normalize dates to avoid timezone issues
    const normalizedPreviousWeek = normalizeWeekStart(previousWeek);
    const previousWeekEntry = member.kpiWeeks.find((entry) => {
      const entryWeek = normalizeWeekStart(new Date(entry.weekStart));
      return entryWeek.getTime() === normalizedPreviousWeek.getTime();
    });
    const previousWeekSubmitted = !!previousWeekEntry?.id;

    // Check if current week was already submitted
    const normalizedCurrentWeek = normalizeWeekStart(currentWeekMonday);
    const currentWeekEntry = member.kpiWeeks.find((entry) => {
      const entryWeek = normalizeWeekStart(new Date(entry.weekStart));
      return entryWeek.getTime() === normalizedCurrentWeek.getTime();
    });
    const currentWeekSubmitted = !!currentWeekEntry?.id;

    // Build available weeks array
    // Only show weeks that are NOT submitted, UNLESS both are submitted (then show both for editing)
    const availableWeeks = [];

    // Add previous week if: not submitted OR both are submitted
    if (!previousWeekSubmitted || (previousWeekSubmitted && currentWeekSubmitted)) {
      availableWeeks.push({
        weekStart: previousWeek.toISOString(),
        label: `KW${getWeekInfo(previousWeek).weekNumber} (${getWeekRangeString(previousWeek)})`,
        weekNumber: getWeekInfo(previousWeek).weekNumber,
        isDefault: !previousWeekSubmitted && !currentWeekSubmitted, // Default if neither is submitted
        alreadySubmitted: previousWeekSubmitted,
      });
    }

    // Add current week if: not submitted OR both are submitted
    if (!currentWeekSubmitted || (previousWeekSubmitted && currentWeekSubmitted)) {
      availableWeeks.push({
        weekStart: currentWeekMonday.toISOString(),
        label: `KW${getWeekInfo(currentWeekMonday).weekNumber} (${getWeekRangeString(currentWeekMonday)})`,
        weekNumber: getWeekInfo(currentWeekMonday).weekNumber,
        isDefault: previousWeekSubmitted && !currentWeekSubmitted, // Default if previous is done but current is not
        alreadySubmitted: currentWeekSubmitted,
      });
    }

    // Smart default: current week if previous is submitted, otherwise previous week
    let selectedWeekStart: string;
    if (previousWeekSubmitted && !currentWeekSubmitted) {
      selectedWeekStart = currentWeekMonday.toISOString();
    } else if (availableWeeks.length > 0) {
      // Use the first available week (which should be the default)
      selectedWeekStart = availableWeeks.find((w) => w.isDefault)?.weekStart || availableWeeks[0].weekStart;
    } else {
      // Fallback to previous week if no weeks available (shouldn't happen)
      selectedWeekStart = previousWeek.toISOString();
    }

    return NextResponse.json({
      member: {
        id: member.id,
        vorname: member.vorname,
        nachname: member.nachname,
        trackKontakte: member.trackKontakte,
        trackTermine: member.trackTermine,
        trackEinheiten: member.trackEinheiten,
        trackEmpfehlungen: member.trackEmpfehlungen,
        trackEntscheider: member.trackEntscheider,
        trackAbschluesse: member.trackAbschluesse,
        umsatzSollWoche: member.umsatzSollWoche,
        kontakteSoll: member.kontakteSoll,
        termineVereinbartSoll: member.termineVereinbartSoll,
        termineAbschlussSoll: member.termineAbschlussSoll,
        einheitenSoll: member.einheitenSoll,
        empfehlungenSoll: member.empfehlungenSoll,
      },
      availableWeeks,
      selectedWeekStart,
      isPreview: true,
    });
  }

  return NextResponse.json({ error: "Token nicht gefunden" }, { status: 404 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const formToken = await prisma.formToken.findUnique({
    where: { token },
    include: { member: true },
  });

  if (!formToken) {
    return NextResponse.json({ error: "Token nicht gefunden" }, { status: 404 });
  }

  if (formToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "Token abgelaufen" }, { status: 400 });
  }

  if (formToken.type !== "weekly") {
    return NextResponse.json({ error: "Ungültiger Token-Typ" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validatedData = weeklyKpiFormSchema.parse(body);

    // Use weekStart from body (user selection), token, or fall back to previous week
    // Normalize to ensure consistent comparison (Monday 00:00:00 local time)
    const weekStart = normalizeWeekStart(
      body.weekStart
        ? new Date(body.weekStart)
        : formToken.weekStart
        ? new Date(formToken.weekStart)
        : getPreviousWeek(getCurrentWeekStart())
    );
    const { weekNumber, year } = getWeekInfo(weekStart);

    // Calculate no-show quote
    let noshowQuote = null;
    if (
      validatedData.termineStattgefundenIst &&
      validatedData.termineNoshowIst
    ) {
      const total =
        validatedData.termineStattgefundenIst + validatedData.termineNoshowIst;
      if (total > 0) {
        noshowQuote = validatedData.termineNoshowIst / total;
      }
    }

    // Calculate konvertierungTerminIst (Kontakt → Termin %)
    let konvertierungTerminIst = null;
    if (
      validatedData.kontakteIst &&
      validatedData.termineVereinbartIst &&
      validatedData.kontakteIst > 0
    ) {
      konvertierungTerminIst = (validatedData.termineVereinbartIst / validatedData.kontakteIst) * 100;
    }

    // Calculate abschlussquoteIst (Termin → Abschluss %)
    let abschlussquoteIst = null;
    if (
      validatedData.termineStattgefundenIst &&
      validatedData.termineAbschlussIst &&
      validatedData.termineStattgefundenIst > 0
    ) {
      abschlussquoteIst = (validatedData.termineAbschlussIst / validatedData.termineStattgefundenIst) * 100;
    }

    // Create or update KPI week
    const kpiWeek = await prisma.kpiWeek.upsert({
      where: {
        memberId_weekStart: {
          memberId: formToken.memberId,
          weekStart,
        },
      },
      create: {
        memberId: formToken.memberId,
        weekStart,
        weekNumber,
        year,
        ...validatedData,
        noshowQuote,
        konvertierungTerminIst,
        abschlussquoteIst,
        submittedAt: new Date(),
      },
      update: {
        ...validatedData,
        noshowQuote,
        konvertierungTerminIst,
        abschlussquoteIst,
        submittedAt: new Date(),
      },
    });

    // Mark token as used
    await prisma.formToken.update({
      where: { id: formToken.id },
      data: { usedAt: new Date() },
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
        where: { id: formToken.memberId },
        data: { reviewFlag: true },
      });

      // Create task for review
      await createFeedbackBlockTask(kpiWeek.id, formToken.memberId, (anomalyCheck.reason || "Daten-Anomalie"), "Q2");

      // Log automation
      await prisma.automationLog.create({
        data: {
          memberId: formToken.memberId,
          ruleId: "Q2",
          ruleName: "Daten-Anomalie",
          actionsTaken: ["BLOCK_AI_FEEDBACK", "SET_FLAG: reviewFlag", "CREATE_TASK: Review"],
          details: { reason: anomalyCheck.reason, kpiWeekId: kpiWeek.id },
        },
      });
    } else {
      // Generate AI feedback (async, don't wait)
      generateAiFeedback(kpiWeek.id, formToken.member, kpiWeek).catch(
        console.error
      );
    }

    // Run automation rules (async, don't wait)
    runKpiAutomations(formToken.memberId, kpiWeek.id).catch(console.error);

    return NextResponse.json({ success: true, kpiWeekId: kpiWeek.id });
  } catch (error) {
    console.error("Error submitting KPI:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern der KPIs" },
      { status: 500 }
    );
  }
}

async function generateAiFeedback(
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
