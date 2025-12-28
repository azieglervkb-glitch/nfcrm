import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateKpiFeedback } from "@/lib/openai";

function getRandomDelayMinutes(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return min;
  return min + Math.random() * (max - min);
}

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
          },
        },
      },
    });

    if (!kpiWeek || !kpiWeek.member) {
      return NextResponse.json({ error: "KPI not found" }, { status: 404 });
    }

    // Only allow regenerate while it's planned (scheduled) and not yet sent
    if (!kpiWeek.whatsappScheduledFor || kpiWeek.whatsappFeedbackSent) {
      return NextResponse.json(
        {
          error: "not_regeneratable",
          message:
            "KI-Feedback kann nur neu erstellt werden, solange es geplant und noch nicht gesendet ist.",
        },
        { status: 400 }
      );
    }

    // Do not regenerate if blocked (handled via review-task flow)
    if (kpiWeek.aiFeedbackBlocked) {
      return NextResponse.json(
        {
          error: "blocked",
          message:
            "KI-Feedback ist blockiert. Bitte den Review-Task abschließen, um die Generierung freizugeben.",
        },
        { status: 400 }
      );
    }

    const { text, style } = await generateKpiFeedback(kpiWeek.member, kpiWeek);

    const settings = await prisma.systemSettings.findFirst({
      where: { id: "default" },
    });
    const delayMin = settings?.aiFeedbackDelayMin ?? 60;
    const delayMax = settings?.aiFeedbackDelayMax ?? 120;
    const delayMinutes = getRandomDelayMinutes(delayMin, delayMax);
    const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);

    const updated = await prisma.kpiWeek.update({
      where: { id: kpiWeek.id },
      data: {
        // overwrite old feedback
        aiFeedbackGenerated: true,
        aiFeedbackText: text,
        aiFeedbackStyle: style,
        aiFeedbackGeneratedAt: new Date(),
        // re-plan WhatsApp send
        whatsappScheduledFor: kpiWeek.member.whatsappNummer ? scheduledFor : null,
        whatsappFeedbackSent: false,
        whatsappSentAt: null,
      },
      select: {
        id: true,
        weekStart: true,
        weekNumber: true,
        year: true,
        aiFeedbackText: true,
        aiFeedbackGeneratedAt: true,
        whatsappScheduledFor: true,
        whatsappFeedbackSent: true,
        whatsappSentAt: true,
      },
    });

    await prisma.automationLog.create({
      data: {
        memberId: kpiWeek.member.id,
        ruleId: "AI_REGENERATE",
        ruleName: "AI Feedback Regenerated",
        triggered: true,
        actionsTaken: ["REGENERATE_AI_FEEDBACK", "RESCHEDULE_WHATSAPP"],
        details: {
          kpiWeekId: kpiWeek.id,
          delayMinutes: Math.round(delayMinutes),
          scheduledFor: kpiWeek.member.whatsappNummer
            ? scheduledFor.toISOString()
            : null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      kpiWeek: {
        ...updated,
        weekStart: updated.weekStart.toISOString(),
        aiFeedbackGeneratedAt: updated.aiFeedbackGeneratedAt?.toISOString() || null,
        whatsappScheduledFor: updated.whatsappScheduledFor?.toISOString() || null,
        whatsappSentAt: updated.whatsappSentAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Regenerate AI feedback error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
