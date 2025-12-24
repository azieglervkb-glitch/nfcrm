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

    // Get all active members with their KPI weeks
    const members = await prisma.member.findMany({
      where: {
        status: "AKTIV",
      },
      include: {
        kpiWeeks: {
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
        if (m.kpiWeeks.length === 0) return null;

        let totalKontakteRate = 0;
        let totalTermineRate = 0;
        let totalAbschluesseRate = 0;
        let kontakteCount = 0;
        let termineCount = 0;
        let abschluesseCount = 0;

        m.kpiWeeks.forEach((entry) => {
          if (entry.kontakteIst !== null && m.kontakteSoll) {
            totalKontakteRate += (entry.kontakteIst / m.kontakteSoll) * 100;
            kontakteCount++;
          }
          if (entry.termineVereinbartIst !== null && m.termineVereinbartSoll) {
            totalTermineRate += (entry.termineVereinbartIst / m.termineVereinbartSoll) * 100;
            termineCount++;
          }
          if (entry.termineAbschlussIst !== null && m.termineAbschlussSoll) {
            totalAbschluesseRate += (entry.termineAbschlussIst / m.termineAbschlussSoll) * 100;
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
          name: `${m.vorname} ${m.nachname}`,
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

    // KPI trend by week - get all KPI weeks with member data for targets
    const kpiWeeksWithMembers = await prisma.kpiWeek.findMany({
      where: {
        weekStart: { gte: startDate },
        member: { status: "AKTIV" },
      },
      include: {
        member: {
          select: {
            kontakteSoll: true,
            termineVereinbartSoll: true,
            termineAbschlussSoll: true,
          },
        },
      },
      orderBy: { weekStart: "asc" },
    });

    const kpiTrend: { [key: string]: { total: number; count: number } } = {};

    kpiWeeksWithMembers.forEach((entry) => {
      const weekKey = entry.weekStart.toISOString().split("T")[0];
      if (!kpiTrend[weekKey]) {
        kpiTrend[weekKey] = { total: 0, count: 0 };
      }

      let score = 0;
      let metrics = 0;

      if (entry.kontakteIst !== null && entry.member.kontakteSoll) {
        score += Math.min(100, (entry.kontakteIst / entry.member.kontakteSoll) * 100);
        metrics++;
      }
      if (entry.termineVereinbartIst !== null && entry.member.termineVereinbartSoll) {
        score += Math.min(100, (entry.termineVereinbartIst / entry.member.termineVereinbartSoll) * 100);
        metrics++;
      }
      if (entry.termineAbschlussIst !== null && entry.member.termineAbschlussSoll) {
        score += Math.min(100, (entry.termineAbschlussIst / entry.member.termineAbschlussSoll) * 100);
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
