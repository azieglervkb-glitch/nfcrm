import { NextResponse } from "next/server";
import { isKpiTrackingWindowOpen } from "@/lib/cron-scheduler";
import { getPreviousWeek, getCurrentWeekStart, getWeekInfo, getWeekRangeString } from "@/lib/date-utils";

/**
 * Get current time in Europe/Berlin timezone
 */
function getBerlinTime(): Date {
  const now = new Date();
  const berlinTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  return berlinTime;
}

/**
 * Determine which week should be tracked based on the day:
 * - Friday/Saturday/Sunday: CURRENT week (the week ending this Sunday)
 * - Monday: PREVIOUS week (the week that ended yesterday)
 * - Tuesday-Thursday: PREVIOUS week (for consistency, though window is closed)
 */
function getTargetWeekForTracking(): Date {
  const now = getBerlinTime();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday

  const currentWeekStart = getCurrentWeekStart();

  if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
    // Friday, Saturday, Sunday - target is current week (ending this Sunday)
    return currentWeekStart;
  } else {
    // Monday to Thursday - target is previous week
    return getPreviousWeek(currentWeekStart);
  }
}

/**
 * API endpoint to check if the KPI tracking window is currently open
 * Used by the weekly form to determine if tracking is allowed
 */
export async function GET() {
  try {
    const windowStatus = await isKpiTrackingWindowOpen();

    // Calculate which week should be tracked based on the day
    const targetWeekStart = getTargetWeekForTracking();
    const targetWeek = getWeekInfo(targetWeekStart);
    const weekRangeString = getWeekRangeString(targetWeekStart);

    return NextResponse.json({
      isOpen: windowStatus.isOpen,
      message: windowStatus.reason,
      opensAt: windowStatus.opensAt?.toISOString(),
      closesAt: windowStatus.closesAt?.toISOString(),
      targetWeek: {
        weekNumber: targetWeek.weekNumber,
        year: targetWeek.year,
        weekStart: targetWeekStart.toISOString(),
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
