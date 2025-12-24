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
    const days = parseInt(searchParams.get("days") || "90");
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get all members
    const members = await prisma.member.findMany({
      include: {
        communicationLogs: {
          orderBy: { sentAt: "desc" },
          take: 1,
        },
      },
    });

    // Summary stats
    const totalMembers = members.length;
    const activeMembers = members.filter((m) => m.status === "AKTIV").length;
    const atRiskMembers = members.filter((m) => m.churnRisk).length;
    const pausedMembers = members.filter((m) => m.status === "PAUSIERT").length;
    const churnedMembers = members.filter((m) => m.status === "GEKUENDIGT").length;

    const retentionRate =
      totalMembers > 0
        ? Math.round(((totalMembers - churnedMembers) / totalMembers) * 100)
        : 100;
    const churnRate = totalMembers > 0 ? Math.round((churnedMembers / totalMembers) * 100) : 0;

    // At-risk list with reasons
    const atRiskList = members
      .filter((m) => m.churnRisk || m.status === "PAUSIERT")
      .map((m) => {
        const lastActivity = m.communicationLogs[0]?.sentAt || m.updatedAt;
        const daysInactive = Math.floor(
          (Date.now() - new Date(lastActivity).getTime()) / (24 * 60 * 60 * 1000)
        );

        let riskReason = "Unknown";
        if (m.status === "PAUSIERT") {
          riskReason = "Membership paused";
        } else if (daysInactive > 14) {
          riskReason = "No activity for 14+ days";
        } else if (daysInactive > 7) {
          riskReason = "Low engagement";
        } else {
          riskReason = "Marked as at-risk";
        }

        return {
          id: m.id,
          name: `${m.vorname} ${m.nachname}`,
          email: m.email,
          status: m.status,
          riskReason,
          lastActivity: lastActivity?.toISOString() || null,
          daysInactive,
        };
      })
      .sort((a, b) => b.daysInactive - a.daysInactive);

    // Churned list
    const churnedList = members
      .filter((m) => m.status === "GEKUENDIGT")
      .map((m) => {
        const membershipDuration = Math.floor(
          (Date.now() - new Date(m.createdAt).getTime()) / (24 * 60 * 60 * 1000)
        );

        return {
          id: m.id,
          name: `${m.vorname} ${m.nachname}`,
          email: m.email,
          churnDate: m.updatedAt?.toISOString() || null,
          membershipDuration,
        };
      })
      .sort((a, b) => {
        if (!a.churnDate) return 1;
        if (!b.churnDate) return -1;
        return new Date(b.churnDate).getTime() - new Date(a.churnDate).getTime();
      });

    // Monthly retention data
    const months: { [key: string]: { retained: number; churned: number } } = {};
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    // Initialize months in the range
    for (let i = 0; i < Math.min(days / 30, 12); i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      months[key] = { retained: 0, churned: 0 };
    }

    // Count members by month
    members.forEach((m) => {
      const date = new Date(m.createdAt);
      if (date >= startDate) {
        const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        if (months[key]) {
          if (m.status === "GEKUENDIGT") {
            months[key].churned++;
          } else {
            months[key].retained++;
          }
        }
      }
    });

    const retentionByMonth = Object.entries(months)
      .map(([month, data]) => ({
        month,
        retained: data.retained,
        churned: data.churned,
        rate:
          data.retained + data.churned > 0
            ? Math.round((data.retained / (data.retained + data.churned)) * 100)
            : 100,
      }))
      .reverse();

    return NextResponse.json({
      summary: {
        totalMembers,
        activeMembers,
        atRiskMembers,
        pausedMembers,
        churnedMembers,
        retentionRate,
        churnRate,
      },
      atRiskList,
      churnedList,
      retentionByMonth,
    });
  } catch (error) {
    console.error("Failed to fetch retention data:", error);
    return NextResponse.json(
      { error: "Failed to fetch retention data" },
      { status: 500 }
    );
  }
}
