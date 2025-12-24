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
        kpiWeeks: {
          orderBy: { weekStart: "desc" },
          take: 1,
        },
      },
    });

    const totalMembers = members.length;
    const activeMembers = members.filter((m) => m.status === "AKTIV").length;
    const churnedMembers = members.filter((m) => m.status === "GEKUENDIGT").length;

    // Calculate retention rate
    const retentionRate =
      totalMembers > 0
        ? Math.round(((totalMembers - churnedMembers) / totalMembers) * 100)
        : 100;

    // Calculate average KPI score
    let totalKpiScore = 0;
    let kpiCount = 0;
    members.forEach((m) => {
      if (m.kpiWeeks.length > 0) {
        const entry = m.kpiWeeks[0];
        let score = 0;
        let metrics = 0;

        if (entry.kontakteIst !== null && m.kontakteSoll) {
          score += Math.min(100, (entry.kontakteIst / m.kontakteSoll) * 100);
          metrics++;
        }
        if (entry.termineVereinbartIst !== null && m.termineVereinbartSoll) {
          score += Math.min(100, (entry.termineVereinbartIst / m.termineVereinbartSoll) * 100);
          metrics++;
        }
        if (entry.termineAbschlussIst !== null && m.termineAbschlussSoll) {
          score += Math.min(100, (entry.termineAbschlussIst / m.termineAbschlussSoll) * 100);
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
      if (m.kpiWeeks.length > 0) {
        const entry = m.kpiWeeks[0];
        let score = 0;
        let metrics = 0;

        if (entry.kontakteIst !== null && m.kontakteSoll) {
          score += Math.min(100, (entry.kontakteIst / m.kontakteSoll) * 100);
          metrics++;
        }
        if (entry.termineVereinbartIst !== null && m.termineVereinbartSoll) {
          score += Math.min(100, (entry.termineVereinbartIst / m.termineVereinbartSoll) * 100);
          metrics++;
        }

        if (metrics > 0 && score / metrics >= 80) {
          topPerformers++;
        }
      }
    });

    // Count at-risk members (using churnRisk flag)
    const atRiskMembers = members.filter(
      (m) => m.churnRisk || m.status === "PAUSIERT"
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
