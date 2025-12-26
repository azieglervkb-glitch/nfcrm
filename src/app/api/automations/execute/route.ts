import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  checkLowFeelingStreak,
  checkLeistungsabfall,
  checkUpsellSignal,
  checkFunnelLeak,
  checkMomentumStreak,
  checkHighNoShow,
  checkMissingTrackedField,
  checkHeldentat,
  checkBlockade,
  checkSmartNudge,
  checkGoalCelebration,
  checkHappyHighPerformer,
  checkChurnRisk,
  checkSilentMember,
  checkDatenAnomalie,
} from "@/lib/automation/engine";

// Execute a specific automation rule on a member (for testing)
// This is a LIVE execution - actions will be performed!

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { memberId, ruleId, clearCooldown } = body;

    if (!memberId || !ruleId) {
      return NextResponse.json(
        { error: "memberId and ruleId are required" },
        { status: 400 }
      );
    }

    // Get member with KPI data
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        kpiWeeks: {
          orderBy: { weekStart: "desc" },
          take: 12,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const latestKpi = member.kpiWeeks[0];

    // Optionally clear cooldown before executing
    if (clearCooldown) {
      await prisma.automationCooldown.deleteMany({
        where: {
          memberId: member.id,
          ruleId: { startsWith: ruleId },
        },
      });
    }

    // Get automation log count before execution
    const logCountBefore = await prisma.automationLog.count({
      where: { memberId: member.id, ruleId },
    });

    // Execute the specific rule
    let executed = false;
    let error: string | null = null;

    try {
      switch (ruleId) {
        case "R1":
          await checkLowFeelingStreak(member);
          executed = true;
          break;
        case "R2":
          await checkSilentMember(member);
          executed = true;
          break;
        case "R3":
          await checkLeistungsabfall(member);
          executed = true;
          break;
        case "P1":
          if (latestKpi) {
            await checkUpsellSignal(member, latestKpi);
            executed = true;
          } else {
            error = "Kein KPI vorhanden";
          }
          break;
        case "P2":
          if (latestKpi) {
            await checkFunnelLeak(member, latestKpi);
            executed = true;
          } else {
            error = "Kein KPI vorhanden";
          }
          break;
        case "P3":
          await checkMomentumStreak(member);
          executed = true;
          break;
        case "Q1":
          if (latestKpi) {
            await checkHighNoShow(member, latestKpi);
            executed = true;
          } else {
            error = "Kein KPI vorhanden";
          }
          break;
        case "Q2":
          if (latestKpi) {
            await checkDatenAnomalie(member, latestKpi);
            executed = true;
          } else {
            error = "Kein KPI vorhanden";
          }
          break;
        case "Q3":
          if (latestKpi) {
            await checkMissingTrackedField(member, latestKpi);
            executed = true;
          } else {
            error = "Kein KPI vorhanden";
          }
          break;
        case "C1":
          if (latestKpi) {
            await checkHeldentat(member, latestKpi);
            executed = true;
          } else {
            error = "Kein KPI vorhanden";
          }
          break;
        case "C2":
          if (latestKpi) {
            await checkBlockade(member, latestKpi);
            executed = true;
          } else {
            error = "Kein KPI vorhanden";
          }
          break;
        case "C3":
          await checkSmartNudge(member);
          executed = true;
          break;
        case "L1":
          await checkChurnRisk(member);
          executed = true;
          break;
        case "L2":
          if (latestKpi) {
            await checkHappyHighPerformer(member, latestKpi);
            executed = true;
          } else {
            error = "Kein KPI vorhanden";
          }
          break;
        default:
          error = `Unbekannte Regel: ${ruleId}`;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Unbekannter Fehler";
    }

    // Get automation log count after execution
    const logCountAfter = await prisma.automationLog.count({
      where: { memberId: member.id, ruleId },
    });

    // Get the latest log entry if one was created
    let logEntry = null;
    if (logCountAfter > logCountBefore) {
      logEntry = await prisma.automationLog.findFirst({
        where: { memberId: member.id, ruleId },
        orderBy: { createdAt: "desc" },
      });
    }

    // Check current cooldown status
    const cooldown = await prisma.automationCooldown.findFirst({
      where: {
        memberId: member.id,
        ruleId: { startsWith: ruleId },
      },
    });

    // Get any tasks created by this rule recently
    const recentTasks = await prisma.task.findMany({
      where: {
        memberId: member.id,
        ruleId,
        createdAt: { gte: new Date(Date.now() - 60000) }, // Last minute
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Get any notes created recently
    const recentNotes = await prisma.memberNote.findMany({
      where: {
        memberId: member.id,
        createdAt: { gte: new Date(Date.now() - 60000) },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      success: executed && !error,
      executed,
      error,
      triggered: logCountAfter > logCountBefore,
      member: {
        id: member.id,
        name: `${member.vorname} ${member.nachname}`,
      },
      ruleId,
      log: logEntry ? {
        id: logEntry.id,
        actionsTaken: logEntry.actionsTaken,
        details: logEntry.details,
        createdAt: logEntry.createdAt,
      } : null,
      cooldown: cooldown ? {
        expiresAt: cooldown.expiresAt,
        isActive: cooldown.expiresAt > new Date(),
      } : null,
      effects: {
        tasksCreated: recentTasks.map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
        })),
        notesCreated: recentNotes.map((n) => ({
          id: n.id,
          content: n.content.substring(0, 100),
          isPinned: n.isPinned,
        })),
      },
    });
  } catch (error) {
    console.error("Execute automation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
