import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
        hauptzielEinSatz: true,
        umsatzSollWoche: true,
        umsatzSollMonat: true,
        kontakteSoll: true,
        entscheiderSoll: true,
        termineVereinbartSoll: true,
        termineStattgefundenSoll: true,
        termineAbschlussSoll: true,
        einheitenSoll: true,
        empfehlungenSoll: true,
        konvertierungTerminSoll: true,
        abschlussquoteSoll: true,
        trackKontakte: true,
        trackTermine: true,
        trackAbschluesse: true,
        trackEinheiten: true,
        trackEmpfehlungen: true,
        trackEntscheider: true,
        trackKonvertierung: true,
        trackAbschlussquote: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({
      vorname: member.vorname,
      hauptzielEinSatz: member.hauptzielEinSatz,
      umsatzSollWoche: member.umsatzSollWoche ? Number(member.umsatzSollWoche) : null,
      umsatzSollMonat: member.umsatzSollMonat ? Number(member.umsatzSollMonat) : null,
      kontakteSoll: member.kontakteSoll,
      entscheiderSoll: member.entscheiderSoll,
      termineVereinbartSoll: member.termineVereinbartSoll,
      termineStattgefundenSoll: member.termineStattgefundenSoll,
      termineAbschlussSoll: member.termineAbschlussSoll,
      einheitenSoll: member.einheitenSoll,
      empfehlungenSoll: member.empfehlungenSoll,
      konvertierungTerminSoll: member.konvertierungTerminSoll ? Number(member.konvertierungTerminSoll) : null,
      abschlussquoteSoll: member.abschlussquoteSoll ? Number(member.abschlussquoteSoll) : null,
      trackKontakte: member.trackKontakte,
      trackTermine: member.trackTermine,
      trackAbschluesse: member.trackAbschluesse,
      trackEinheiten: member.trackEinheiten,
      trackEmpfehlungen: member.trackEmpfehlungen,
      trackEntscheider: member.trackEntscheider,
      trackKonvertierung: member.trackKonvertierung,
      trackAbschlussquote: member.trackAbschlussquote,
    });
  } catch (error) {
    console.error("Failed to fetch member goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch member goals" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      memberId,
      hauptzielEinSatz,
      umsatzSollWoche,
      umsatzSollMonat,
      kontakteSoll,
      entscheiderSoll,
      termineVereinbartSoll,
      termineStattgefundenSoll,
      termineAbschlussSoll,
      einheitenSoll,
      empfehlungenSoll,
      konvertierungTerminSoll,
      abschlussquoteSoll,
      // Track toggles
      trackKontakte,
      trackTermine,
      trackAbschluesse,
      trackEinheiten,
      trackEmpfehlungen,
      trackEntscheider,
      trackKonvertierung,
      trackAbschlussquote,
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

    // Build update data - only include fields that are explicitly provided
    const updateData: Record<string, unknown> = {};

    if (hauptzielEinSatz !== undefined) updateData.hauptzielEinSatz = hauptzielEinSatz;
    if (umsatzSollWoche !== undefined) updateData.umsatzSollWoche = umsatzSollWoche;
    if (umsatzSollMonat !== undefined) updateData.umsatzSollMonat = umsatzSollMonat;
    if (kontakteSoll !== undefined) updateData.kontakteSoll = kontakteSoll;
    if (entscheiderSoll !== undefined) updateData.entscheiderSoll = entscheiderSoll;
    if (termineVereinbartSoll !== undefined) updateData.termineVereinbartSoll = termineVereinbartSoll;
    if (termineStattgefundenSoll !== undefined) updateData.termineStattgefundenSoll = termineStattgefundenSoll;
    if (termineAbschlussSoll !== undefined) updateData.termineAbschlussSoll = termineAbschlussSoll;
    if (einheitenSoll !== undefined) updateData.einheitenSoll = einheitenSoll;
    if (empfehlungenSoll !== undefined) updateData.empfehlungenSoll = empfehlungenSoll;
    if (konvertierungTerminSoll !== undefined) updateData.konvertierungTerminSoll = konvertierungTerminSoll;
    if (abschlussquoteSoll !== undefined) updateData.abschlussquoteSoll = abschlussquoteSoll;

    // Track toggles
    if (trackKontakte !== undefined) updateData.trackKontakte = trackKontakte;
    if (trackTermine !== undefined) updateData.trackTermine = trackTermine;
    if (trackAbschluesse !== undefined) updateData.trackAbschluesse = trackAbschluesse;
    if (trackEinheiten !== undefined) updateData.trackEinheiten = trackEinheiten;
    if (trackEmpfehlungen !== undefined) updateData.trackEmpfehlungen = trackEmpfehlungen;
    if (trackEntscheider !== undefined) updateData.trackEntscheider = trackEntscheider;
    if (trackKonvertierung !== undefined) updateData.trackKonvertierung = trackKonvertierung;
    if (trackAbschlussquote !== undefined) updateData.trackAbschlussquote = trackAbschlussquote;

    // Update member goals and tracking settings
    const updated = await prisma.member.update({
      where: { id: memberId },
      data: updateData,
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (error) {
    console.error("Failed to update member goals:", error);
    return NextResponse.json(
      { error: "Failed to update member goals" },
      { status: 500 }
    );
  }
}
