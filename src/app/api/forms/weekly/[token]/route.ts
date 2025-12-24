import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { weeklyKpiFormSchema } from "@/lib/validations";
import { getCurrentWeekStart, getWeekInfo } from "@/lib/date-utils";
import { generateKpiFeedback, hasDataAnomaly } from "@/lib/openai";
import { sendWhatsApp, isInQuietHours } from "@/lib/whatsapp";
import { runKpiAutomations } from "@/lib/automation/engine";

export async function GET(
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
  });
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

    const weekStart = getCurrentWeekStart();
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
        submittedAt: new Date(),
      },
      update: {
        ...validatedData,
        noshowQuote,
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

      // Log automation
      await prisma.automationLog.create({
        data: {
          memberId: formToken.memberId,
          ruleId: "Q2",
          ruleName: "Daten-Anomalie",
          actionsTaken: ["BLOCK_AI_FEEDBACK", "SET_FLAG: reviewFlag"],
          details: { reason: anomalyCheck.reason },
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
    // Generate feedback
    const { text, style } = await generateKpiFeedback(member, kpiWeek);

    // Save feedback
    await prisma.kpiWeek.update({
      where: { id: kpiWeekId },
      data: {
        aiFeedbackGenerated: true,
        aiFeedbackText: text,
        aiFeedbackStyle: style,
        aiFeedbackGeneratedAt: new Date(),
      },
    });

    // Send via WhatsApp if not in quiet hours and member has WhatsApp number
    if (member.whatsappNummer && !isInQuietHours()) {
      const sent = await sendWhatsApp({
        recipient: member.whatsappNummer,
        message: text,
      });

      if (sent) {
        await prisma.kpiWeek.update({
          where: { id: kpiWeekId },
          data: {
            whatsappFeedbackSent: true,
            whatsappSentAt: new Date(),
          },
        });

        // Log communication
        await prisma.communicationLog.create({
          data: {
            memberId: member.id,
            channel: "WHATSAPP",
            type: "FEEDBACK",
            content: text,
            recipient: member.whatsappNummer,
            sent: true,
            sentAt: new Date(),
          },
        });
      }
    }
  } catch (error) {
    console.error("Error generating AI feedback:", error);
  }
}
