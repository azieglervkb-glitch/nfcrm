import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      memberId,
      hauptzielEinSatz,
      umsatzSollWoche,
      umsatzSollMonat,
      trackKontakte,
      trackTermine,
      trackEinheiten,
      trackEmpfehlungen,
      trackEntscheider,
      trackAbschluesse,
      kontakteSoll,
      termineVereinbartSoll,
      termineAbschlussSoll,
      einheitenSoll,
      empfehlungenSoll,
    } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID erforderlich" },
        { status: 400 }
      );
    }

    // Update member with KPI setup data
    const member = await prisma.member.update({
      where: { id: memberId },
      data: {
        // KPI Tracking aktivieren
        kpiTrackingEnabled: true,
        kpiTrackingEnabledAt: new Date(),
        kpiSetupCompleted: true,
        kpiSetupCompletedAt: new Date(),
        // Legacy fields for backward compatibility
        kpiTrackingActive: true,
        kpiTrackingStartDate: new Date(),
        hauptzielEinSatz,

        // Umsatzziele
        umsatzSollWoche,
        umsatzSollMonat,

        // Welche KPIs werden getrackt
        trackKontakte,
        trackTermine,
        trackEinheiten,
        trackEmpfehlungen,
        trackEntscheider,
        trackAbschluesse,

        // SOLL-Werte
        kontakteSoll: kontakteSoll || null,
        termineVereinbartSoll: termineVereinbartSoll || null,
        termineAbschlussSoll: termineAbschlussSoll || null,
        einheitenSoll: einheitenSoll || null,
        empfehlungenSoll: empfehlungenSoll || null,
      },
    });

    // Log automation
    await prisma.automationLog.create({
      data: {
        memberId: member.id,
        ruleId: "MEMBER_PORTAL",
        ruleName: "KPI Setup via Member Portal",
        actionsTaken: ["ACTIVATE_KPI_TRACKING", "SET_KPI_TARGETS"],
        details: {
          hauptzielEinSatz,
          umsatzSollWoche,
          umsatzSollMonat,
          trackedKpis: {
            kontakte: trackKontakte,
            termine: trackTermine,
            einheiten: trackEinheiten,
            empfehlungen: trackEmpfehlungen,
            entscheider: trackEntscheider,
            abschluesse: trackAbschluesse,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "KPI-Tracking aktiviert",
    });
  } catch (error) {
    console.error("KPI Setup error:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern" },
      { status: 500 }
    );
  }
}
