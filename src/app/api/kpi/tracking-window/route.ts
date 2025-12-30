import { NextResponse } from "next/server";
import { isKpiTrackingWindowOpen } from "@/lib/cron-scheduler";
import { getPreviousWeek, getCurrentWeekStart, getWeekInfo, getWeekRangeString } from "@/lib/date-utils";

/**
 * API endpoint to check if the KPI tracking window is currently open
 * Used by the weekly form to determine if tracking is allowed
 */
export async function GET() {
  try {
    const windowStatus = await isKpiTrackingWindowOpen();

    // Calculate which week should be tracked
    // During the open window (Friday-Monday), members track the previous week
    const currentWeekStart = getCurrentWeekStart();
    const previousWeekStart = getPreviousWeek(currentWeekStart);
    const targetWeek = getWeekInfo(previousWeekStart);
    const weekRangeString = getWeekRangeString(previousWeekStart);

    return NextResponse.json({
      isOpen: windowStatus.isOpen,
      message: windowStatus.reason,
      opensAt: windowStatus.opensAt?.toISOString(),
      closesAt: windowStatus.closesAt?.toISOString(),
      targetWeek: {
        weekNumber: targetWeek.weekNumber,
        year: targetWeek.year,
        weekStart: previousWeekStart.toISOString(),
        label: `KW${targetWeek.weekNumber} (${weekRangeString})`,
      },
    });
  } catch (error) {
    console.error("Error checking tracking window:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
