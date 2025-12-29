import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activateKpiTracking } from "@/lib/kpi-tracking";

/**
 * Bulk actions for members
 * POST /api/members/bulk-actions
 * Body: { action: "activate_kpi_tracking", memberIds: string[] }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can perform bulk actions
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, memberIds } = body;

    if (!action || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: "action and memberIds array required" },
        { status: 400 }
      );
    }

    const results = {
      success: [] as string[],
      failed: [] as Array<{ memberId: string; error: string }>,
    };

    if (action === "activate_kpi_tracking") {
      for (const memberId of memberIds) {
        try {
          // force: true skips onboarding/module checks for admin bulk actions
          const result = await activateKpiTracking(memberId, "manual", { force: true });
          if (result.activated) {
            results.success.push(memberId);
          } else {
            results.failed.push({
              memberId,
              error: result.reason || "Aktivierung fehlgeschlagen",
            });
          }
        } catch (error) {
          results.failed.push({
            memberId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    } else {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      results: {
        total: memberIds.length,
        success: results.success.length,
        failed: results.failed.length,
        details: results,
      },
    });
  } catch (error) {
    console.error("Bulk action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
