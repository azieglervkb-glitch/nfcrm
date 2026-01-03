import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { weeklyKpiFormSchema } from "@/lib/validations";
import { getCurrentWeekStart, getWeekInfo } from "@/lib/date-utils";
import { generateKpiFeedback, hasDataAnomaly } from "@/lib/openai";
import { runKpiAutomations } from "@/lib/automation/engine";
import { createFeedbackBlockTask } from "@/lib/feedback-block-helper";
import { notifyAdminsOnKpiSubmission } from "@/lib/email";

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

    return NextResponse.json({
      member: {
        id: formToken.member.id,
        vorname: formToken.member.vorname,
        nachname: formToken.member.nachname,
        trackKontakte: formToken.member.trackKontakte,
        trackTermine: formToken.member.trackTermine,
        trackEinheiten: formToken.member.trackEinheiten,
        trackEmpfehlungen: formToken.member.trackEmpfehlungen,
        trackEntscheider: formToken.member.trackEntscheider,
        trackAbschluesse: formToken.member.trackAbschluesse,
        umsatzSollWoche: formToken.member.umsatzSollWoche,
        kontakteSoll: formToken.member.kontakteSoll,
        termineVereinbartSoll: formToken.member.termineVereinbartSoll,
        termineAbschlussSoll: formToken.member.termineAbschlussSoll,
        einheitenSoll: formToken.member.einheitenSoll,
        empfehlungenSoll: formToken.member.empfehlungenSoll,
      },
      isPreview: false,
    });
  }

  // If no token found, try to find by member ID (for admin preview)
  const member = await prisma.member.findUnique({
    where: { id: token },
  });

  if (member) {
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

    // Priority for weekStart:
    // 1. Client-provided weekStart (when user selects a specific week)
    // 2. Token weekStart (from reminder)
    // 3. Current week (fallback)
    let weekStart: Date;
    if (body.weekStart) {
      weekStart = new Date(body.weekStart);
      weekStart.setHours(0, 0, 0, 0);
    } else if (formToken.weekStart) {
      weekStart = formToken.weekStart;
    } else {
      weekStart = getCurrentWeekStart();
    }
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

    // Create or update KPI week with goal snapshots
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
        // Store goal snapshots at creation time
        umsatzSollSnapshot: formToken.member.umsatzSollWoche,
        kontakteSollSnapshot: formToken.member.kontakteSoll,
        entscheiderSollSnapshot: formToken.member.entscheiderSoll,
        termineVereinbartSollSnapshot: formToken.member.termineVereinbartSoll,
        termineStattgefundenSollSnapshot: formToken.member.termineStattgefundenSoll,
        termineAbschlussSollSnapshot: formToken.member.termineAbschlussSoll,
        einheitenSollSnapshot: formToken.member.einheitenSoll,
        empfehlungenSollSnapshot: formToken.member.empfehlungenSoll,
        konvertierungTerminSollSnapshot: formToken.member.konvertierungTerminSoll,
        abschlussquoteSollSnapshot: formToken.member.abschlussquoteSoll,
      },
      update: {
        ...validatedData,
        noshowQuote,
        konvertierungTerminIst,
        abschlussquoteIst,
        submittedAt: new Date(),
        // Update goal snapshots on re-submission
        umsatzSollSnapshot: formToken.member.umsatzSollWoche,
        kontakteSollSnapshot: formToken.member.kontakteSoll,
        entscheiderSollSnapshot: formToken.member.entscheiderSoll,
        termineVereinbartSollSnapshot: formToken.member.termineVereinbartSoll,
        termineStattgefundenSollSnapshot: formToken.member.termineStattgefundenSoll,
        termineAbschlussSollSnapshot: formToken.member.termineAbschlussSoll,
        einheitenSollSnapshot: formToken.member.einheitenSoll,
        empfehlungenSollSnapshot: formToken.member.empfehlungenSoll,
        konvertierungTerminSollSnapshot: formToken.member.konvertierungTerminSoll,
        abschlussquoteSollSnapshot: formToken.member.abschlussquoteSoll,
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

    // Notify admins with notification enabled (async, don't wait)
    notifyAdminsOnKpiSubmission(
      { id: formToken.memberId, vorname: formToken.member.vorname, nachname: formToken.member.nachname },
      {
        weekNumber,
        year,
        umsatzIst: kpiWeek.umsatzIst ? Number(kpiWeek.umsatzIst) : null,
        feelingScore: kpiWeek.feelingScore,
      }
    ).catch(console.error);

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
    let scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);

    // Adjust for quiet hours - if scheduled time falls in quiet hours, move to after quiet hours
    const { adjustForQuietHours } = await import("@/lib/whatsapp");
    scheduledFor = await adjustForQuietHours(scheduledFor);

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
