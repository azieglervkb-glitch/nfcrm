import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30");
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get all members with their KPI entries
    const members = await prisma.member.findMany({
      where: {
        status: { in: ["ACTIVE", "AT_RISK"] },
      },
      include: {
        kpiEntries: {
          where: {
            weekStart: { gte: startDate },
          },
          orderBy: { weekStart: "desc" },
        },
      },
    });

    // Calculate scores for each member
    const memberScores = members
      .map((m) => {
        if (m.kpiEntries.length === 0) return null;

        let totalKontakteRate = 0;
        let totalTermineRate = 0;
        let totalAbschluesseRate = 0;
        let kontakteCount = 0;
        let termineCount = 0;
        let abschluesseCount = 0;

        m.kpiEntries.forEach((entry) => {
          if (entry.kontakteGenerated !== null && entry.kontakteTarget) {
            totalKontakteRate += (entry.kontakteGenerated / entry.kontakteTarget) * 100;
            kontakteCount++;
          }
          if (entry.termineClosed !== null && entry.termineTarget) {
            totalTermineRate += (entry.termineClosed / entry.termineTarget) * 100;
            termineCount++;
          }
          if (entry.abschluesseCount !== null && entry.abschluesseTarget) {
            totalAbschluesseRate += (entry.abschluesseCount / entry.abschluesseTarget) * 100;
            abschluesseCount++;
          }
        });

        const kontakteRate = kontakteCount > 0 ? Math.round(totalKontakteRate / kontakteCount) : 0;
        const termineRate = termineCount > 0 ? Math.round(totalTermineRate / termineCount) : 0;
        const abschluesseRate = abschluesseCount > 0 ? Math.round(totalAbschluesseRate / abschluesseCount) : 0;

        // Calculate overall KPI score
        let totalScore = 0;
        let scoreCount = 0;
        if (kontakteCount > 0) {
          totalScore += kontakteRate;
          scoreCount++;
        }
        if (termineCount > 0) {
          totalScore += termineRate;
          scoreCount++;
        }
        if (abschluesseCount > 0) {
          totalScore += abschluesseRate;
          scoreCount++;
        }

        const kpiScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

        // Determine issue if underperforming
        let issue = "";
        if (kpiScore < 50) {
          if (kontakteRate < 50) issue = "Low contact generation";
          else if (termineRate < 50) issue = "Low appointment closure rate";
          else if (abschluesseRate < 50) issue = "Low deal closure rate";
          else issue = "Overall underperformance";
        }

        return {
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          email: m.email,
          kpiScore,
          kontakteRate,
          termineRate,
          abschluesseRate,
          issue,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    // Summary stats
    const totalTracked = memberScores.length;
    const avgKpiScore =
      totalTracked > 0
        ? Math.round(memberScores.reduce((sum, m) => sum + m.kpiScore, 0) / totalTracked)
        : 0;

    const topPerformers = memberScores.filter((m) => m.kpiScore >= 80).length;
    const underPerformers = memberScores.filter((m) => m.kpiScore < 50).length;

    const avgKontakteRate =
      totalTracked > 0
        ? Math.round(memberScores.reduce((sum, m) => sum + m.kontakteRate, 0) / totalTracked)
        : 0;
    const avgTermineRate =
      totalTracked > 0
        ? Math.round(memberScores.reduce((sum, m) => sum + m.termineRate, 0) / totalTracked)
        : 0;
    const avgAbschluesseRate =
      totalTracked > 0
        ? Math.round(memberScores.reduce((sum, m) => sum + m.abschluesseRate, 0) / totalTracked)
        : 0;

    // Top performers list (sorted by score)
    const topPerformersList = memberScores
      .filter((m) => m.kpiScore >= 80)
      .sort((a, b) => b.kpiScore - a.kpiScore)
      .slice(0, 10);

    // Underperformers list
    const underPerformersList = memberScores
      .filter((m) => m.kpiScore < 50)
      .sort((a, b) => a.kpiScore - b.kpiScore)
      .slice(0, 10);

    // KPI trend by week
    const kpiTrend: { [key: string]: { total: number; count: number } } = {};

    // Get all KPI entries in the range
    const allKpiEntries = await prisma.kPIEntry.findMany({
      where: {
        weekStart: { gte: startDate },
        member: { status: { in: ["ACTIVE", "AT_RISK"] } },
      },
      orderBy: { weekStart: "asc" },
    });

    allKpiEntries.forEach((entry) => {
      const weekKey = entry.weekStart.toISOString().split("T")[0];
      if (!kpiTrend[weekKey]) {
        kpiTrend[weekKey] = { total: 0, count: 0 };
      }

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
        kpiTrend[weekKey].total += score / metrics;
        kpiTrend[weekKey].count++;
      }
    });

    const kpiTrendData = Object.entries(kpiTrend)
      .map(([week, data]) => ({
        week: new Date(week).toLocaleDateString("de-DE", {
          month: "short",
          day: "numeric",
        }),
        avgScore: data.count > 0 ? Math.round(data.total / data.count) : 0,
      }))
      .slice(-8); // Last 8 weeks

    return NextResponse.json({
      summary: {
        avgKpiScore,
        topPerformers,
        underPerformers,
        totalTracked,
        avgKontakteRate,
        avgTermineRate,
        avgAbschluesseRate,
      },
      topPerformersList,
      underPerformersList,
      kpiTrend: kpiTrendData,
    });
  } catch (error) {
    console.error("Failed to fetch performance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance data" },
      { status: 500 }
    );
  }
}
