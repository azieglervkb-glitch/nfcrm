import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekStart, getPreviousWeek, getWeekInfo } from "@/lib/date-utils";

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

    // Members enter data for the PREVIOUS week (what they achieved last week)
    const weekStart = getPreviousWeek(getCurrentWeekStart());

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

    // Members enter data for the PREVIOUS week (what they achieved last week)
    const weekStart = getPreviousWeek(getCurrentWeekStart());
    const { weekNumber, year } = getWeekInfo(weekStart);

    // Upsert KPI entry
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
