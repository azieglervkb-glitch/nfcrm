import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth";
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
    // Support direct memberId parameter or session-based auth
    const { searchParams } = new URL(request.url);
    const directMemberId = searchParams.get("memberId");

    let memberId: string;

    if (directMemberId) {
      memberId = directMemberId;
    } else {
      const session = await getMemberSession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      memberId = session.memberId;
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
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
        kontakteIst: entry.kontakteIst,
        termineVereinbartIst: entry.termineVereinbartIst,
        termineAbschlussIst: entry.termineAbschlussIst,
        umsatzIst: entry.umsatzIst ? Number(entry.umsatzIst) : null,
        feelingScore: entry.feelingScore,
      }));

    return NextResponse.json({
      member: {
        vorname: member.vorname,
        nachname: member.nachname,
        kontakteSoll: member.kontakteSoll,
        termineVereinbartSoll: member.termineVereinbartSoll,
        termineAbschlussSoll: member.termineAbschlussSoll,
        umsatzSollWoche: member.umsatzSollWoche ? Number(member.umsatzSollWoche) : null,
      },
      currentWeek: currentWeek
        ? {
            id: currentWeek.id,
            kontakteIst: currentWeek.kontakteIst,
            termineVereinbartIst: currentWeek.termineVereinbartIst,
            termineAbschlussIst: currentWeek.termineAbschlussIst,
            umsatzIst: currentWeek.umsatzIst ? Number(currentWeek.umsatzIst) : null,
            feelingScore: currentWeek.feelingScore,
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
      memberId: directMemberId,
      kontakteIst,
      termineVereinbartIst,
      termineAbschlussIst,
      umsatzIst,
      feelingScore,
    } = body;

    let memberId: string;

    if (directMemberId) {
      memberId = directMemberId;
    } else {
      const session = await getMemberSession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      memberId = session.memberId;
    }

    const weekStart = getCurrentWeekStart();
    const weekNumber = getWeekNumber(weekStart);
    const year = weekStart.getFullYear();

    // Fetch member's current goals for snapshot
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        umsatzSollWoche: true,
        kontakteSoll: true,
        entscheiderSoll: true,
        termineVereinbartSoll: true,
        termineStattgefundenSoll: true,
        termineAbschlussSoll: true,
        einheitenSoll: true,
        empfehlungenSoll: true,
      },
    });

    // Goal snapshot data - copy current goals to KpiWeek
    const goalSnapshot = {
      umsatzSollWoche: member?.umsatzSollWoche,
      kontakteSoll: member?.kontakteSoll,
      entscheiderSoll: member?.entscheiderSoll,
      termineVereinbartSoll: member?.termineVereinbartSoll,
      termineStattgefundenSoll: member?.termineStattgefundenSoll,
      termineAbschlussSoll: member?.termineAbschlussSoll,
      einheitenSoll: member?.einheitenSoll,
      empfehlungenSoll: member?.empfehlungenSoll,
    };

    // Upsert KPI entry with goal snapshot
    const kpiWeek = await prisma.kpiWeek.upsert({
      where: {
        memberId_weekStart: {
          memberId,
          weekStart,
        },
      },
      update: {
        kontakteIst,
        termineVereinbartIst,
        termineAbschlussIst,
        umsatzIst,
        feelingScore,
        submittedAt: new Date(),
        // Update goals snapshot on each save
        ...goalSnapshot,
      },
      create: {
        memberId,
        weekStart,
        weekNumber,
        year,
        kontakteIst,
        termineVereinbartIst,
        termineAbschlussIst,
        umsatzIst,
        feelingScore,
        submittedAt: new Date(),
        // Save goals snapshot on create
        ...goalSnapshot,
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
