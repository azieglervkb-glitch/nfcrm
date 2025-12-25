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
        termineVereinbartSoll: true,
        termineAbschlussSoll: true,
        einheitenSoll: true,
        empfehlungenSoll: true,
        trackKontakte: true,
        trackTermine: true,
        trackAbschluesse: true,
        trackEinheiten: true,
        trackEmpfehlungen: true,
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
      termineVereinbartSoll: member.termineVereinbartSoll,
      termineAbschlussSoll: member.termineAbschlussSoll,
      einheitenSoll: member.einheitenSoll,
      empfehlungenSoll: member.empfehlungenSoll,
      trackKontakte: member.trackKontakte,
      trackTermine: member.trackTermine,
      trackAbschluesse: member.trackAbschluesse,
      trackEinheiten: member.trackEinheiten,
      trackEmpfehlungen: member.trackEmpfehlungen,
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
      termineVereinbartSoll,
      termineAbschlussSoll,
      einheitenSoll,
      empfehlungenSoll,
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

    // Update member goals
    const updated = await prisma.member.update({
      where: { id: memberId },
      data: {
        hauptzielEinSatz,
        umsatzSollWoche,
        umsatzSollMonat,
        kontakteSoll,
        termineVereinbartSoll,
        termineAbschlussSoll,
        einheitenSoll,
        empfehlungenSoll,
      },
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
