import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all members
    const members = await prisma.member.findMany({
      include: {
        kpiEntries: {
          orderBy: { weekStart: "desc" },
          take: 1,
        },
      },
    });

    const totalMembers = members.length;
    const activeMembers = members.filter((m) => m.status === "ACTIVE").length;
    const churnedMembers = members.filter((m) => m.status === "CHURNED").length;

    // Calculate retention rate
    const retentionRate =
      totalMembers > 0
        ? Math.round(((totalMembers - churnedMembers) / totalMembers) * 100)
        : 100;

    // Calculate average KPI score
    let totalKpiScore = 0;
    let kpiCount = 0;
    members.forEach((m) => {
      if (m.kpiEntries.length > 0) {
        const entry = m.kpiEntries[0];
        // Calculate simple KPI score based on available metrics
        let score = 0;
        let metrics = 0;

        if (entry.kontakteGenerated !== null && entry.kontakteTarget) {
          score += Math.min(100, (entry.kontakteGenerated / entry.kontakteTarget) * 100);
          metrics++;
        }
        if (entry.termineClosed !== null && entry.termineTarget) {
          score += Math.min(100, (entry.termineClosed / entry.termineTarget) * 100);
          metrics++;
        }
        if (entry.abschluesseCount !== null && entry.abschluesseTarget) {
          score += Math.min(100, (entry.abschluesseCount / entry.abschluesseTarget) * 100);
          metrics++;
        }

        if (metrics > 0) {
          totalKpiScore += score / metrics;
          kpiCount++;
        }
      }
    });
    const avgKpiScore = kpiCount > 0 ? Math.round(totalKpiScore / kpiCount) : 0;

    // Count top performers (KPI > 80%)
    let topPerformers = 0;
    members.forEach((m) => {
      if (m.kpiEntries.length > 0) {
        const entry = m.kpiEntries[0];
        let score = 0;
        let metrics = 0;

        if (entry.kontakteGenerated !== null && entry.kontakteTarget) {
          score += Math.min(100, (entry.kontakteGenerated / entry.kontakteTarget) * 100);
          metrics++;
        }
        if (entry.termineClosed !== null && entry.termineTarget) {
          score += Math.min(100, (entry.termineClosed / entry.termineTarget) * 100);
          metrics++;
        }

        if (metrics > 0 && score / metrics >= 80) {
          topPerformers++;
        }
      }
    });

    // Count at-risk members
    const atRiskMembers = members.filter(
      (m) => m.status === "AT_RISK" || m.status === "PAUSED"
    ).length;

    // Weekly growth - members created in last 7 days
    const weeklyGrowth = members.filter(
      (m) => new Date(m.createdAt) >= oneWeekAgo
    ).length;

    return NextResponse.json({
      totalMembers,
      activeMembers,
      churnedMembers,
      retentionRate,
      avgKpiScore,
      topPerformers,
      atRiskMembers,
      weeklyGrowth,
    });
  } catch (error) {
    console.error("Failed to fetch report stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
