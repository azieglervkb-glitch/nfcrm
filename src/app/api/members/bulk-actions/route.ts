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
          // force: false ensures onboarding must be completed first
          const result = await activateKpiTracking(memberId, "manual", { force: false });
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
    } else if (action === "deactivate_kpi_tracking") {
      for (const memberId of memberIds) {
        try {
          await prisma.member.update({
            where: { id: memberId },
            data: { kpiTrackingEnabled: false },
          });
          results.success.push(memberId);
        } catch (error) {
          results.failed.push({
            memberId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    } else if (action === "delete") {
      // Only SUPER_ADMIN can delete members
      if (session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Nur Super-Admins können Member löschen" },
          { status: 403 }
        );
      }

      for (const memberId of memberIds) {
        try {
          // Delete related records first (in correct order due to foreign keys)
          await prisma.$transaction(async (tx) => {
            // Delete KPI weeks
            await tx.kpiWeek.deleteMany({ where: { memberId } });
            // Delete automation cooldowns
            await tx.automationCooldown.deleteMany({ where: { memberId } });
            // Delete automation logs
            await tx.automationLog.deleteMany({ where: { memberId } });
            // Delete form tokens
            await tx.formToken.deleteMany({ where: { memberId } });
            // Delete member notes
            await tx.memberNote.deleteMany({ where: { memberId } });
            // Delete tasks
            await tx.task.deleteMany({ where: { memberId } });
            // Delete upsell pipelines
            await tx.upsellPipeline.deleteMany({ where: { memberId } });
            // Delete communication logs
            await tx.communicationLog.deleteMany({ where: { memberId } });
            // Delete member sessions
            await tx.memberSession.deleteMany({ where: { memberId } });
            // Finally delete the member
            await tx.member.delete({ where: { id: memberId } });
          });
          results.success.push(memberId);
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
