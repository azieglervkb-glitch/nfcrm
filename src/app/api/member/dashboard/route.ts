import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await prisma.member.findUnique({
      where: { id: session.memberId },
      include: {
        kpiEntries: {
          orderBy: { weekStart: "desc" },
          take: 4,
        },
        goals: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get current week's KPI entry
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const currentWeekKpi = member.kpiEntries.find((entry) => {
      const entryWeek = new Date(entry.weekStart);
      return entryWeek.getTime() === weekStart.getTime();
    });

    // Calculate weekly score
    let weeklyScore = 0;
    if (currentWeekKpi) {
      let score = 0;
      let metrics = 0;

      if (currentWeekKpi.kontakteGenerated !== null && currentWeekKpi.kontakteTarget) {
        score += Math.min(100, (currentWeekKpi.kontakteGenerated / currentWeekKpi.kontakteTarget) * 100);
        metrics++;
      }
      if (currentWeekKpi.termineClosed !== null && currentWeekKpi.termineTarget) {
        score += Math.min(100, (currentWeekKpi.termineClosed / currentWeekKpi.termineTarget) * 100);
        metrics++;
      }
      if (currentWeekKpi.abschluesseCount !== null && currentWeekKpi.abschluesseTarget) {
        score += Math.min(100, (currentWeekKpi.abschluesseCount / currentWeekKpi.abschluesseTarget) * 100);
        metrics++;
      }

      weeklyScore = metrics > 0 ? Math.round(score / metrics) : 0;
    }

    // Calculate streak (weeks with KPI entries)
    let streak = 0;
    for (const entry of member.kpiEntries) {
      if (
        entry.kontakteGenerated !== null ||
        entry.termineClosed !== null ||
        entry.abschluesseCount !== null
      ) {
        streak++;
      } else {
        break;
      }
    }

    // Count goals
    const pendingGoals = member.goals.filter((g) => g.status === "ACTIVE").length;
    const completedGoals = member.goals.filter((g) => g.status === "COMPLETED").length;

    return NextResponse.json({
      member: {
        firstName: member.firstName,
        lastName: member.lastName,
        status: member.status,
        onboardingDate: member.onboardingDate?.toISOString() || null,
      },
      currentWeekKpi: currentWeekKpi
        ? {
            kontakteGenerated: currentWeekKpi.kontakteGenerated,
            kontakteTarget: currentWeekKpi.kontakteTarget,
            termineClosed: currentWeekKpi.termineClosed,
            termineTarget: currentWeekKpi.termineTarget,
            abschluesseCount: currentWeekKpi.abschluesseCount,
            abschluesseTarget: currentWeekKpi.abschluesseTarget,
          }
        : null,
      weeklyScore,
      streak,
      pendingGoals,
      completedGoals,
    });
  } catch (error) {
    console.error("Failed to fetch member dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard" },
      { status: 500 }
    );
  }
}
