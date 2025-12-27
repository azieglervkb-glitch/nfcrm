import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekStart, getWeekInfo } from "@/lib/date-utils";
import { sendChurnWarningEmail } from "@/lib/email";
import { subWeeks } from "date-fns";

// This endpoint should be called weekly (e.g., Monday 9:00)
// It handles:
// - Churn risk detection (2+ weeks no KPI)
// - Danger zone detection (4+ weeks no KPI)
// - Inactive member flagging

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const twoWeeksAgo = subWeeks(now, 2);
    const fourWeeksAgo = subWeeks(now, 4);

    const results = {
      churnRiskFlagged: 0,
      dangerZoneFlagged: 0,
      emailsSent: 0,
      tasksCreated: 0,
      errors: [] as string[],
    };

    // Find members with potential churn risk (2+ weeks no KPI)
    const inactiveMembers = await prisma.member.findMany({
      where: {
        status: "AKTIV",
        kpiTrackingActive: true,
        churnRisk: false, // Not already flagged
      },
      include: {
        kpiWeeks: {
          orderBy: { weekStart: "desc" },
          take: 1,
        },
      },
    });

    for (const member of inactiveMembers) {
      try {
        const lastKpi = member.kpiWeeks[0];
        const lastKpiDate = lastKpi?.submittedAt || lastKpi?.weekStart;

        if (!lastKpiDate) continue;

        const weeksSinceLastKpi = Math.floor(
          (now.getTime() - new Date(lastKpiDate).getTime()) / (7 * 24 * 60 * 60 * 1000)
        );

        // Check for churn risk (2+ weeks)
        if (weeksSinceLastKpi >= 2 && weeksSinceLastKpi < 4) {
          // Set churn risk flag
          await prisma.member.update({
            where: { id: member.id },
            data: { churnRisk: true },
          });
          results.churnRiskFlagged++;

          // Create task
          await prisma.task.create({
            data: {
              memberId: member.id,
              title: `Retention-Call: ${member.vorname} ${member.nachname}`,
              description: `${weeksSinceLastKpi} Wochen ohne KPI-Abgabe. Bitte zeitnah kontaktieren.`,
              priority: "HIGH",
              status: "OPEN",
              ruleId: "L1",
            },
          });
          results.tasksCreated++;

          // Send warning email
          const emailSent = await sendChurnWarningEmail(member, weeksSinceLastKpi);
          if (emailSent) results.emailsSent++;

          // Log automation
          await prisma.automationLog.create({
            data: {
              memberId: member.id,
              ruleId: "L1",
              ruleName: "Kündigungsrisiko",
              triggered: true,
              actionsTaken: [
                "SET_FLAG: churnRisk = true",
                "CREATE_TASK: Retention-Call",
                emailSent ? "SEND_EMAIL: Churn Warning" : "EMAIL_SKIPPED",
              ],
              details: { weeksSinceLastKpi },
            },
          });
        }

        // Check for danger zone (4+ weeks)
        if (weeksSinceLastKpi >= 4 && !member.dangerZone) {
          await prisma.member.update({
            where: { id: member.id },
            data: { dangerZone: true, churnRisk: true },
          });
          results.dangerZoneFlagged++;

          // Create urgent task
          await prisma.task.create({
            data: {
              memberId: member.id,
              title: `🚨 DANGER ZONE: ${member.vorname} ${member.nachname}`,
              description: `${weeksSinceLastKpi} Wochen ohne Aktivität! Sofortiger Kontakt erforderlich.`,
              priority: "URGENT",
              status: "OPEN",
              ruleId: "R3",
            },
          });
          results.tasksCreated++;

          // Log automation
          await prisma.automationLog.create({
            data: {
              memberId: member.id,
              ruleId: "R3",
              ruleName: "Danger Zone",
              triggered: true,
              actionsTaken: [
                "SET_FLAG: dangerZone = true",
                "CREATE_TASK: Urgent Kontakt",
              ],
              details: { weeksSinceLastKpi },
            },
          });
        }
      } catch (error) {
        results.errors.push(`${member.email}: ${error}`);
      }
    }

    // Log the cron run
    await prisma.automationLog.create({
      data: {
        ruleId: "CRON",
        ruleName: "Scheduled Automations",
        triggered: true,
        actionsTaken: [
          `${results.churnRiskFlagged} members flagged as churn risk`,
          `${results.dangerZoneFlagged} members flagged as danger zone`,
          `${results.tasksCreated} tasks created`,
          `${results.emailsSent} emails sent`,
        ],
        details: results,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Scheduled automations completed",
      results,
    });
  } catch (error) {
    console.error("Scheduled automation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
