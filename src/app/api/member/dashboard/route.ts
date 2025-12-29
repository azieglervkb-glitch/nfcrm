import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekStart } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  try {
    // Support direct memberId parameter or session-based auth
    const { searchParams } = new URL(request.url);
    const directMemberId = searchParams.get("memberId");

    let memberId: string;

    if (directMemberId) {
      // Direct access via URL parameter
      memberId = directMemberId;
    } else {
      // Session-based access
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
          take: 4,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get current week's KPI entry
    const weekStart = getCurrentWeekStart();

    const currentWeekKpi = member.kpiWeeks.find((entry) => {
      const entryWeek = new Date(entry.weekStart);
      return entryWeek.getTime() === weekStart.getTime();
    });

    // Calculate weekly score based on available KPIs
    let weeklyScore = 0;
    if (currentWeekKpi) {
      let score = 0;
      let metrics = 0;

      // Kontakte
      if (currentWeekKpi.kontakteIst !== null && member.kontakteSoll) {
        score += Math.min(100, (currentWeekKpi.kontakteIst / member.kontakteSoll) * 100);
        metrics++;
      }
      // Termine
      if (currentWeekKpi.termineVereinbartIst !== null && member.termineVereinbartSoll) {
        score += Math.min(100, (currentWeekKpi.termineVereinbartIst / member.termineVereinbartSoll) * 100);
        metrics++;
      }
      // Abschlüsse
      if (currentWeekKpi.termineAbschlussIst !== null && member.termineAbschlussSoll) {
        score += Math.min(100, (currentWeekKpi.termineAbschlussIst / member.termineAbschlussSoll) * 100);
        metrics++;
      }

      weeklyScore = metrics > 0 ? Math.round(score / metrics) : 0;
    }

    // Calculate streak (weeks with KPI entries)
    let streak = 0;
    for (const entry of member.kpiWeeks) {
      if (
        entry.kontakteIst !== null ||
        entry.termineVereinbartIst !== null ||
        entry.umsatzIst !== null
      ) {
        streak++;
      } else {
        break;
      }
    }

    return NextResponse.json({
      member: {
        firstName: member.vorname,
        lastName: member.nachname,
        status: member.status,
        onboardingDate: member.onboardingDate?.toISOString() || null,
      },
      currentWeekKpi: currentWeekKpi
        ? {
            kontakteGenerated: currentWeekKpi.kontakteIst,
            kontakteTarget: member.kontakteSoll || 0,
            termineClosed: currentWeekKpi.termineVereinbartIst,
            termineTarget: member.termineVereinbartSoll || 0,
            abschluesseCount: currentWeekKpi.termineAbschlussIst,
            abschluesseTarget: member.termineAbschlussSoll || 0,
          }
        : null,
      weeklyScore,
      streak,
      pendingGoals: 0,
      completedGoals: 0,
    });
  } catch (error) {
    console.error("Failed to fetch member dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard" },
      { status: 500 }
    );
  }
}
