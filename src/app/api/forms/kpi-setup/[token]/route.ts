import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // First try to find a FormToken
    const formToken = await prisma.formToken.findUnique({
      where: { token },
      include: {
        member: {
          select: {
            id: true,
            vorname: true,
            nachname: true,
            zielMonatsumsatz: true,
            kpiTrackingEnabled: true,
            kpiSetupCompleted: true,
          },
        },
      },
    });

    if (formToken) {
      if (formToken.type !== "kpi-setup") {
        return NextResponse.json({ error: "Falscher Token-Typ" }, { status: 400 });
      }

      if (formToken.expiresAt < new Date()) {
        return NextResponse.json({ error: "Token abgelaufen" }, { status: 400 });
      }

      if (formToken.usedAt) {
        return NextResponse.json({ error: "Token bereits verwendet" }, { status: 400 });
      }

      if (formToken.member.kpiSetupCompleted) {
        return NextResponse.json({ error: "KPI-Setup bereits abgeschlossen" }, { status: 400 });
      }

      return NextResponse.json({
        member: {
          vorname: formToken.member.vorname,
          nachname: formToken.member.nachname,
          zielMonatsumsatz: formToken.member.zielMonatsumsatz,
        },
        isPreview: false,
      });
    }

    // If no token found, try to find by member ID (for admin preview)
    const member = await prisma.member.findUnique({
      where: { id: token },
      select: {
        id: true,
        vorname: true,
        nachname: true,
        zielMonatsumsatz: true,
        kpiTrackingActive: true,
      },
    });

    if (member) {
      return NextResponse.json({
        member: {
          vorname: member.vorname,
          nachname: member.nachname,
          zielMonatsumsatz: member.zielMonatsumsatz,
        },
        isPreview: true,
      });
    }

    return NextResponse.json({ error: "Token nicht gefunden" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching KPI setup form:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();

    const formToken = await prisma.formToken.findUnique({
      where: { token },
      include: {
        member: true,
      },
    });

    if (!formToken) {
      return NextResponse.json({ error: "Token nicht gefunden" }, { status: 404 });
    }

    if (formToken.type !== "kpi-setup") {
      return NextResponse.json({ error: "Falscher Token-Typ" }, { status: 400 });
    }

    if (formToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "Token abgelaufen" }, { status: 400 });
    }

    if (formToken.usedAt) {
      return NextResponse.json({ error: "Token bereits verwendet" }, { status: 400 });
    }

    // Update member with KPI tracking settings
    // Store structured data in kpiSetupData for future extensibility
    const kpiSetupData = {
      hauptzielEinSatz: body.hauptzielEinSatz,
      trackKontakte: body.trackKontakte ?? false,
      trackTermine: body.trackTermine ?? false,
      trackEinheiten: body.trackEinheiten ?? false,
      trackEmpfehlungen: body.trackEmpfehlungen ?? false,
      trackEntscheider: body.trackEntscheider ?? false,
      trackAbschluesse: body.trackAbschluesse ?? false,
      // Add any additional fields from the form here
    };

    await prisma.member.update({
      where: { id: formToken.memberId },
      data: {
        // Mark setup as completed
        kpiSetupCompleted: true,
        kpiSetupCompletedAt: new Date(),
        // Ensure tracking is enabled (should already be set, but double-check)
        kpiTrackingEnabled: true,
        // Keep legacy fields for backward compatibility
        kpiTrackingActive: true, // DEPRECATED but keep for now
        kpiTrackingStartDate: new Date(), // DEPRECATED but keep for now
        hauptzielEinSatz: body.hauptzielEinSatz,
        umsatzSollWoche: body.umsatzSollWoche,
        umsatzSollMonat: body.umsatzSollMonat,
        trackKontakte: body.trackKontakte ?? false,
        trackTermine: body.trackTermine ?? false,
        trackEinheiten: body.trackEinheiten ?? false,
        trackEmpfehlungen: body.trackEmpfehlungen ?? false,
        trackEntscheider: body.trackEntscheider ?? false,
        trackAbschluesse: body.trackAbschluesse ?? false,
        kontakteSoll: body.kontakteSoll ?? null,
        termineVereinbartSoll: body.termineVereinbartSoll ?? null,
        termineAbschlussSoll: body.termineAbschlussSoll ?? null,
        einheitenSoll: body.einheitenSoll ?? null,
        empfehlungenSoll: body.empfehlungenSoll ?? null,
        // Store structured data
        kpiSetupData: kpiSetupData as any,
      },
    });

    // Mark token as used
    await prisma.formToken.update({
      where: { id: formToken.id },
      data: { usedAt: new Date() },
    });

    // Reset reminder count (setup completed, no more reminders needed)
    await prisma.member.update({
      where: { id: formToken.memberId },
      data: {
        kpiSetupReminderCount: 0,
        kpiSetupLastReminderAt: null,
      },
    });

    // Log automation
    await prisma.automationLog.create({
      data: {
        memberId: formToken.memberId,
        ruleId: "SYSTEM",
        ruleName: "KPI-Setup abgeschlossen",
        triggered: true,
        actionsTaken: [
          "KPI_SETUP_COMPLETED",
          "RESET_REMINDER_COUNT",
          "WEEKLY_KPI_TRACKING_ENABLED",
        ],
        details: {
          kpiSetupData,
          completedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error submitting KPI setup form:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
