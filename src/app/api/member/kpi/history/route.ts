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
        nachname: true,
        umsatzSollWoche: true,
        trackKontakte: true,
        trackTermine: true,
        trackEinheiten: true,
        trackEmpfehlungen: true,
        trackEntscheider: true,
        trackAbschluesse: true,
        kpiWeeks: {
          orderBy: { weekStart: "desc" },
          select: {
            id: true,
            weekStart: true,
            weekNumber: true,
            year: true,
            umsatzIst: true,
            kontakteIst: true,
            entscheiderIst: true,
            termineVereinbartIst: true,
            termineStattgefundenIst: true,
            termineAbschlussIst: true,
            termineNoshowIst: true,
            einheitenIst: true,
            empfehlungenIst: true,
            feelingScore: true,
            heldentat: true,
            blockiert: true,
            herausforderung: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({
      member: {
        vorname: member.vorname,
        nachname: member.nachname,
        umsatzSollWoche: member.umsatzSollWoche ? Number(member.umsatzSollWoche) : null,
        trackKontakte: member.trackKontakte,
        trackTermine: member.trackTermine,
        trackEinheiten: member.trackEinheiten,
        trackEmpfehlungen: member.trackEmpfehlungen,
        trackEntscheider: member.trackEntscheider,
        trackAbschluesse: member.trackAbschluesse,
      },
      kpiWeeks: member.kpiWeeks.map((kpi) => ({
        ...kpi,
        umsatzIst: kpi.umsatzIst ? Number(kpi.umsatzIst) : null,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch KPI history:", error);
    return NextResponse.json(
      { error: "Failed to fetch KPI history" },
      { status: 500 }
    );
  }
}
