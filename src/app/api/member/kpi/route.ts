import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekStart, getPreviousWeek, getWeekInfo, getWeekRangeString } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  try {
    // Support direct memberId parameter or session-based auth
    const { searchParams } = new URL(request.url);
    const directMemberId = searchParams.get("memberId");
    const weekStartParam = searchParams.get("weekStart");

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

    // Calculate available weeks for selection (only previous and current week)
    const currentWeekMonday = getCurrentWeekStart();
    const previousWeek = getPreviousWeek(currentWeekMonday);

    // Check if previous week was already submitted
    const previousWeekEntry = member.kpiWeeks.find((entry) => {
      const entryWeek = new Date(entry.weekStart);
      return entryWeek.getTime() === previousWeek.getTime();
    });
    const previousWeekSubmitted = !!previousWeekEntry?.id;

    // Check if current week was already submitted
    const currentWeekEntry = member.kpiWeeks.find((entry) => {
      const entryWeek = new Date(entry.weekStart);
      return entryWeek.getTime() === currentWeekMonday.getTime();
    });
    const currentWeekSubmitted = !!currentWeekEntry?.id;

    // Build available weeks array
    // Only show weeks that are NOT submitted, UNLESS both are submitted (then show both for editing)
    const availableWeeks = [];

    // Add previous week if: not submitted OR both are submitted
    if (!previousWeekSubmitted || (previousWeekSubmitted && currentWeekSubmitted)) {
      availableWeeks.push({
        weekStart: previousWeek.toISOString(),
        label: `KW${getWeekInfo(previousWeek).weekNumber} (${getWeekRangeString(previousWeek)})`,
        weekNumber: getWeekInfo(previousWeek).weekNumber,
        isDefault: !previousWeekSubmitted && !currentWeekSubmitted, // Default if neither is submitted
        alreadySubmitted: previousWeekSubmitted,
      });
    }

    // Add current week if: not submitted OR both are submitted
    if (!currentWeekSubmitted || (previousWeekSubmitted && currentWeekSubmitted)) {
      availableWeeks.push({
        weekStart: currentWeekMonday.toISOString(),
        label: `KW${getWeekInfo(currentWeekMonday).weekNumber} (${getWeekRangeString(currentWeekMonday)})`,
        weekNumber: getWeekInfo(currentWeekMonday).weekNumber,
        isDefault: previousWeekSubmitted && !currentWeekSubmitted, // Default if previous is done but current is not
        alreadySubmitted: currentWeekSubmitted,
      });
    }

    // Use provided weekStart or smart default
    // If previous week is submitted but current is not → default to current
    // Otherwise → default to first available week
    let weekStart: Date;
    if (weekStartParam) {
      weekStart = new Date(weekStartParam);
    } else if (previousWeekSubmitted && !currentWeekSubmitted) {
      weekStart = currentWeekMonday;
    } else if (availableWeeks.length > 0) {
      // Use the first available week (which should be the default)
      weekStart = new Date(availableWeeks.find((w) => w.isDefault)?.weekStart || availableWeeks[0].weekStart);
    } else {
      // Fallback to previous week if no weeks available (shouldn't happen)
      weekStart = previousWeek;
    }

    const selectedWeek = member.kpiWeeks.find((entry) => {
      const entryWeek = new Date(entry.weekStart);
      return entryWeek.getTime() === weekStart.getTime();
    });

    // History (exclude selected week)
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
      availableWeeks,
      selectedWeekStart: weekStart.toISOString(),
      currentWeek: selectedWeek
        ? {
            id: selectedWeek.id,
            kontakteIst: selectedWeek.kontakteIst,
            termineVereinbartIst: selectedWeek.termineVereinbartIst,
            termineAbschlussIst: selectedWeek.termineAbschlussIst,
            umsatzIst: selectedWeek.umsatzIst ? Number(selectedWeek.umsatzIst) : null,
            feelingScore: selectedWeek.feelingScore,
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
      weekStart: weekStartParam,
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

    // Use provided weekStart or default to previous week
    const weekStart = weekStartParam
      ? new Date(weekStartParam)
      : getPreviousWeek(getCurrentWeekStart());
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
