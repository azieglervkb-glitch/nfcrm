import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekStart, getPreviousWeek } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    }

    const currentWeekStart = getCurrentWeekStart();
    const previousWeekStart = getPreviousWeek(currentWeekStart);

    // Check if current week has been submitted
    const currentWeekKpi = await prisma.kpiWeek.findUnique({
      where: {
        memberId_weekStart: {
          memberId,
          weekStart: currentWeekStart,
        },
      },
      select: { id: true },
    });

    // Check if previous week has been submitted
    const previousWeekKpi = await prisma.kpiWeek.findUnique({
      where: {
        memberId_weekStart: {
          memberId,
          weekStart: previousWeekStart,
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      currentWeekSubmitted: !!currentWeekKpi,
      previousWeekSubmitted: !!previousWeekKpi,
    });
  } catch (error) {
    console.error("Failed to fetch week status:", error);
    return NextResponse.json(
      { error: "Failed to fetch week status" },
      { status: 500 }
    );
  }
}
