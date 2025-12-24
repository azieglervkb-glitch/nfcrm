import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getCurrentWeekStart(): Date {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

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
        trackKontakte: true,
        trackTermine: true,
        trackEinheiten: true,
        trackEmpfehlungen: true,
        trackEntscheider: true,
        trackAbschluesse: true,
        umsatzSollWoche: true,
        kontakteSoll: true,
        entscheiderSoll: true,
        termineVereinbartSoll: true,
        termineStattgefundenSoll: true,
        termineAbschlussSoll: true,
        einheitenSoll: true,
        empfehlungenSoll: true,
        kpiWeeks: {
          orderBy: { weekStart: "desc" },
          take: 12,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const weekStart = getCurrentWeekStart();

    const currentWeek = member.kpiWeeks.find((entry) => {
      const entryWeek = new Date(entry.weekStart);
      return entryWeek.getTime() === weekStart.getTime();
    });

    // History (exclude current week)
    const history = member.kpiWeeks
      .filter((entry) => {
        const entryWeek = new Date(entry.weekStart);
        return entryWeek.getTime() !== weekStart.getTime();
      })
      .map((entry) => ({
        weekStart: entry.weekStart.toISOString(),
        weekNumber: entry.weekNumber,
        umsatzIst: entry.umsatzIst ? Number(entry.umsatzIst) : null,
        kontakteIst: entry.kontakteIst,
        feelingScore: entry.feelingScore,
      }));

    return NextResponse.json({
      member: {
        vorname: member.vorname,
        nachname: member.nachname,
        trackKontakte: member.trackKontakte,
        trackTermine: member.trackTermine,
        trackEinheiten: member.trackEinheiten,
        trackEmpfehlungen: member.trackEmpfehlungen,
        trackEntscheider: member.trackEntscheider,
        trackAbschluesse: member.trackAbschluesse,
        umsatzSollWoche: member.umsatzSollWoche ? Number(member.umsatzSollWoche) : null,
        kontakteSoll: member.kontakteSoll,
        entscheiderSoll: member.entscheiderSoll,
        termineVereinbartSoll: member.termineVereinbartSoll,
        termineStattgefundenSoll: member.termineStattgefundenSoll,
        termineAbschlussSoll: member.termineAbschlussSoll,
        einheitenSoll: member.einheitenSoll,
        empfehlungenSoll: member.empfehlungenSoll,
      },
      currentWeek: currentWeek
        ? {
            id: currentWeek.id,
            umsatzIst: currentWeek.umsatzIst ? Number(currentWeek.umsatzIst) : null,
            kontakteIst: currentWeek.kontakteIst,
            entscheiderIst: currentWeek.entscheiderIst,
            termineVereinbartIst: currentWeek.termineVereinbartIst,
            termineStattgefundenIst: currentWeek.termineStattgefundenIst,
            termineAbschlussIst: currentWeek.termineAbschlussIst,
            termineNoshowIst: currentWeek.termineNoshowIst,
            einheitenIst: currentWeek.einheitenIst,
            empfehlungenIst: currentWeek.empfehlungenIst,
            feelingScore: currentWeek.feelingScore,
            heldentat: currentWeek.heldentat,
            blockiert: currentWeek.blockiert,
            herausforderung: currentWeek.herausforderung,
          }
        : null,
      history,
    });
  } catch (error) {
    console.error("Failed to fetch KPI data:", error);
    return NextResponse.json(
      { error: "Failed to fetch KPI data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      memberId,
      umsatzIst,
      kontakteIst,
      entscheiderIst,
      termineVereinbartIst,
      termineStattgefundenIst,
      termineAbschlussIst,
      termineNoshowIst,
      einheitenIst,
      empfehlungenIst,
      feelingScore,
      heldentat,
      blockiert,
      herausforderung,
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

    const weekStart = getCurrentWeekStart();
    const weekNumber = getWeekNumber(weekStart);
    const year = weekStart.getFullYear();

    // Upsert KPI entry with all fields
    const kpiWeek = await prisma.kpiWeek.upsert({
      where: {
        memberId_weekStart: {
          memberId,
          weekStart,
        },
      },
      update: {
        umsatzIst,
        kontakteIst,
        entscheiderIst,
        termineVereinbartIst,
        termineStattgefundenIst,
        termineAbschlussIst,
        termineNoshowIst,
        einheitenIst,
        empfehlungenIst,
        feelingScore,
        heldentat,
        blockiert,
        herausforderung,
        submittedAt: new Date(),
      },
      create: {
        memberId,
        weekStart,
        weekNumber,
        year,
        umsatzIst,
        kontakteIst,
        entscheiderIst,
        termineVereinbartIst,
        termineStattgefundenIst,
        termineAbschlussIst,
        termineNoshowIst,
        einheitenIst,
        empfehlungenIst,
        feelingScore,
        heldentat,
        blockiert,
        herausforderung,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, kpiWeek });
  } catch (error) {
    console.error("Failed to save KPI data:", error);
    return NextResponse.json(
      { error: "Failed to save KPI data" },
      { status: 500 }
    );
  }
}
