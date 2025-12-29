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
            umsatzSollMonat: true,
            kpiTrackingEnabled: true,
            kpiSetupCompleted: true,
            // KPI tracking flags
            trackKontakte: true,
            trackEntscheider: true,
            trackTermine: true,
            trackKonvertierung: true,
            trackAbschluesse: true,
            trackAbschlussquote: true,
            trackEinheiten: true,
            trackEmpfehlungen: true,
            // KPI target values
            kontakteSoll: true,
            termineVereinbartSoll: true,
            termineAbschlussSoll: true,
            konvertierungTerminSoll: true,
            abschlussquoteSoll: true,
            einheitenSoll: true,
            empfehlungenSoll: true,
            // Context fields
            hauptzielEinSatz: true,
            wasNervtAmMeisten: true,
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

      const m = formToken.member;
      return NextResponse.json({
        member: {
          vorname: m.vorname,
          nachname: m.nachname,
          // Use umsatzSollMonat if set, otherwise fall back to zielMonatsumsatz
          umsatzSollMonat: m.umsatzSollMonat ?? m.zielMonatsumsatz,
          // KPI tracking flags
          trackKontakte: m.trackKontakte ?? false,
          trackEntscheider: m.trackEntscheider ?? false,
          trackTermine: m.trackTermine ?? false,
          trackKonvertierung: m.trackKonvertierung ?? false,
          trackAbschluesse: m.trackAbschluesse ?? false,
          trackAbschlussquote: m.trackAbschlussquote ?? false,
          trackEinheiten: m.trackEinheiten ?? false,
          trackEmpfehlungen: m.trackEmpfehlungen ?? false,
          // KPI target values
          kontakteSoll: m.kontakteSoll,
          termineVereinbartSoll: m.termineVereinbartSoll,
          termineAbschlussSoll: m.termineAbschlussSoll,
          konvertierungTerminSoll: m.konvertierungTerminSoll,
          abschlussquoteSoll: m.abschlussquoteSoll,
          einheitenSoll: m.einheitenSoll,
          empfehlungenSoll: m.empfehlungenSoll,
          // Context fields
          hauptzielEinSatz: m.hauptzielEinSatz,
          wasNervtAmMeisten: m.wasNervtAmMeisten,
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
        umsatzSollMonat: true,
        kpiTrackingActive: true,
        // KPI tracking flags
        trackKontakte: true,
        trackEntscheider: true,
        trackTermine: true,
        trackKonvertierung: true,
        trackAbschluesse: true,
        trackAbschlussquote: true,
        trackEinheiten: true,
        trackEmpfehlungen: true,
        // KPI target values
        kontakteSoll: true,
        termineVereinbartSoll: true,
        termineAbschlussSoll: true,
        konvertierungTerminSoll: true,
        abschlussquoteSoll: true,
        einheitenSoll: true,
        empfehlungenSoll: true,
        // Context fields
        hauptzielEinSatz: true,
        wasNervtAmMeisten: true,
      },
    });

    if (member) {
      return NextResponse.json({
        member: {
          vorname: member.vorname,
          nachname: member.nachname,
          umsatzSollMonat: member.umsatzSollMonat ?? member.zielMonatsumsatz,
          // KPI tracking flags
          trackKontakte: member.trackKontakte ?? false,
          trackEntscheider: member.trackEntscheider ?? false,
          trackTermine: member.trackTermine ?? false,
          trackKonvertierung: member.trackKonvertierung ?? false,
          trackAbschluesse: member.trackAbschluesse ?? false,
          trackAbschlussquote: member.trackAbschlussquote ?? false,
          trackEinheiten: member.trackEinheiten ?? false,
          trackEmpfehlungen: member.trackEmpfehlungen ?? false,
          // KPI target values
          kontakteSoll: member.kontakteSoll,
          termineVereinbartSoll: member.termineVereinbartSoll,
          termineAbschlussSoll: member.termineAbschlussSoll,
          konvertierungTerminSoll: member.konvertierungTerminSoll,
          abschlussquoteSoll: member.abschlussquoteSoll,
          einheitenSoll: member.einheitenSoll,
          empfehlungenSoll: member.empfehlungenSoll,
          // Context fields
          hauptzielEinSatz: member.hauptzielEinSatz,
          wasNervtAmMeisten: member.wasNervtAmMeisten,
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
      wasNervtAmMeisten: body.wasNervtAmMeisten,
      trackKontakte: body.trackKontakte ?? false,
      trackTermine: body.trackTermine ?? false,
      trackKonvertierung: body.trackKonvertierung ?? false,
      trackAbschlussquote: body.trackAbschlussquote ?? false,
      trackEinheiten: body.trackEinheiten ?? false,
      trackEmpfehlungen: body.trackEmpfehlungen ?? false,
      trackEntscheider: body.trackEntscheider ?? false,
      trackAbschluesse: body.trackAbschluesse ?? false,
    };

    // Prepare update data
    const updateData: any = {
      // Mark setup as completed
      kpiSetupCompleted: true,
      kpiSetupCompletedAt: new Date(),
      // Ensure tracking is enabled (should already be set, but double-check)
      kpiTrackingEnabled: true,
      // Keep legacy fields for backward compatibility
      kpiTrackingActive: true, // DEPRECATED but keep for now
      kpiTrackingStartDate: new Date(), // DEPRECATED but keep for now
      // Persönliche Daten (nur wenn gesetzt)
      ...(body.vorname && { vorname: body.vorname }),
      ...(body.nachname && { nachname: body.nachname }),
      ...(body.email && { email: body.email.toLowerCase() }),
      ...(body.telefon && { telefon: body.telefon }),
      // Kontext & Motivation
      hauptzielEinSatz: body.hauptzielEinSatz,
      ...(body.wasNervtAmMeisten && { wasNervtAmMeisten: body.wasNervtAmMeisten }),
      // Ziele
      umsatzSollMonat: body.umsatzSollMonat ? parseFloat(String(body.umsatzSollMonat)) : null,
      umsatzSollWoche: body.umsatzSollMonat
        ? Math.round(parseFloat(String(body.umsatzSollMonat)) / 4)
        : null,
      // KPI Tracking Flags
      trackKontakte: body.trackKontakte ?? false,
      trackTermine: body.trackTermine ?? false,
      trackEinheiten: body.trackEinheiten ?? false,
      trackEmpfehlungen: body.trackEmpfehlungen ?? false,
      trackEntscheider: body.trackEntscheider ?? false,
      trackAbschluesse: body.trackAbschluesse ?? false,
      trackKonvertierung: body.trackKonvertierung ?? false,
      trackAbschlussquote: body.trackAbschlussquote ?? false,
      // SOLL-Werte
      kontakteSoll: body.kontakteSoll ? parseInt(String(body.kontakteSoll)) : null,
      termineVereinbartSoll: body.termineVereinbartSoll
        ? parseInt(String(body.termineVereinbartSoll))
        : null,
      termineAbschlussSoll: body.termineAbschlussSoll
        ? parseInt(String(body.termineAbschlussSoll))
        : null,
      einheitenSoll: body.einheitenSoll ? parseInt(String(body.einheitenSoll)) : null,
      empfehlungenSoll: body.empfehlungenSoll ? parseInt(String(body.empfehlungenSoll)) : null,
      // Neue KPI-Felder
      konvertierungTerminSoll: body.konvertierungTerminSoll
        ? parseFloat(String(body.konvertierungTerminSoll))
        : null,
      abschlussquoteSoll: body.abschlussquoteSoll
        ? parseFloat(String(body.abschlussquoteSoll))
        : null,
      // Store structured data
      kpiSetupData: kpiSetupData as any,
    };

    await prisma.member.update({
      where: { id: formToken.memberId },
      data: updateData,
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
