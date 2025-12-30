import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    }

    // Get goal history sorted by date (newest first)
    const history = await prisma.goalHistory.findMany({
      where: { memberId },
      orderBy: { changedAt: "desc" },
      take: 20, // Limit to last 20 changes
    });

    // Format the response
    const formattedHistory = history.map((entry) => ({
      id: entry.id,
      changedAt: entry.changedAt.toISOString(),
      source: entry.source,
      goals: {
        hauptzielEinSatz: entry.hauptzielEinSatz,
        umsatzSollWoche: entry.umsatzSollWoche ? Number(entry.umsatzSollWoche) : null,
        umsatzSollMonat: entry.umsatzSollMonat ? Number(entry.umsatzSollMonat) : null,
        kontakteSoll: entry.kontakteSoll,
        entscheiderSoll: entry.entscheiderSoll,
        termineVereinbartSoll: entry.termineVereinbartSoll,
        termineStattgefundenSoll: entry.termineStattgefundenSoll,
        termineAbschlussSoll: entry.termineAbschlussSoll,
        einheitenSoll: entry.einheitenSoll,
        empfehlungenSoll: entry.empfehlungenSoll,
        konvertierungTerminSoll: entry.konvertierungTerminSoll ? Number(entry.konvertierungTerminSoll) : null,
        abschlussquoteSoll: entry.abschlussquoteSoll ? Number(entry.abschlussquoteSoll) : null,
      },
      tracking: {
        trackKontakte: entry.trackKontakte,
        trackTermine: entry.trackTermine,
        trackAbschluesse: entry.trackAbschluesse,
        trackEinheiten: entry.trackEinheiten,
        trackEmpfehlungen: entry.trackEmpfehlungen,
        trackEntscheider: entry.trackEntscheider,
        trackKonvertierung: entry.trackKonvertierung,
        trackAbschlussquote: entry.trackAbschlussquote,
      },
    }));

    return NextResponse.json({ history: formattedHistory });
  } catch (error) {
    console.error("Failed to fetch goal history:", error);
    return NextResponse.json(
      { error: "Failed to fetch goal history" },
      { status: 500 }
    );
  }
}
