import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { shouldRunSystemHealth, hasRunThisMinute } from "@/lib/cron-scheduler";
import { getCurrentWeekStart } from "@/lib/date-utils";

// Daily AI-powered system health check (runs at 07:00)
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check for manual trigger (force=true query param)
  const url = new URL(request.url);
  const forceRun = url.searchParams.get("force") === "true";

  try {
    // Check if we should run based on schedule (unless forced)
    if (!forceRun) {
      const scheduleCheck = await shouldRunSystemHealth();
      if (!scheduleCheck.shouldRun) {
        return NextResponse.json({
          skipped: true,
          reason: scheduleCheck.reason,
        });
      }

      // Prevent duplicate runs within the same minute
      if (await hasRunThisMinute("SYSTEM_HEALTH", "System Health Check")) {
        return NextResponse.json({
          skipped: true,
          reason: "Already ran this minute",
        });
      }
    }
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Collect Cronjob Status
    // Note: send-feedback uses CRON_FEEDBACK, others use CRON
    const cronLogs = await prisma.automationLog.findMany({
      where: {
        firedAt: { gte: oneDayAgo },
        ruleId: { in: ["CRON", "CRON_FEEDBACK"] },
      },
      orderBy: { firedAt: "desc" },
    });

    const cronStatus = {
      // send-feedback uses ruleId: "CRON_FEEDBACK", ruleName: "Scheduled Feedback Sender"
      sendFeedback: cronLogs.filter((l) => l.ruleId === "CRON_FEEDBACK" && l.ruleName === "Scheduled Feedback Sender").length,
      // weekly-reminders uses ruleId: "CRON", ruleName: "Weekly Reminders"
      weeklyReminders: cronLogs.filter((l) => l.ruleId === "CRON" && l.ruleName === "Weekly Reminders").length,
      // scheduled-automations uses ruleId: "CRON", ruleName: "Scheduled Automations"
      scheduledAutomations: cronLogs.filter((l) => l.ruleId === "CRON" && l.ruleName === "Scheduled Automations").length,
      // kpi-reminder uses ruleId: "CRON", ruleName: "KPI Reminder Cron"
      kpiReminder: cronLogs.filter((l) => l.ruleId === "CRON" && l.ruleName === "KPI Reminder Cron").length,
    };

    // 2. Collect Error Logs (automation failures)
    const errorLogs = await prisma.automationLog.findMany({
      where: {
        firedAt: { gte: oneDayAgo },
        triggered: false,
      },
      take: 10,
    });

    // 3. Collect pending tasks (open/in_progress)
    const pendingTasks = await prisma.task.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    });

    const urgentTasks = await prisma.task.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] }, priority: "URGENT" },
    });

    const overdueTasks = await prisma.task.count({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        dueDate: { lt: now },
      },
    });

    // 4. Member Stats
    const memberStats = {
      total: await prisma.member.count({ where: { status: "AKTIV" } }),
      churnRisk: await prisma.member.count({ where: { churnRisk: true, status: "AKTIV" } }),
      reviewFlag: await prisma.member.count({ where: { reviewFlag: true } }),
      upsellCandidate: await prisma.member.count({ where: { upsellCandidate: true, status: "AKTIV" } }),
    };

    // 5. KPI Stats for current week
    const weekStart = getCurrentWeekStart();

    const kpisThisWeek = await prisma.kpiWeek.count({
      where: { weekStart: { gte: weekStart } },
    });

    const kpisWithFeedback = await prisma.kpiWeek.count({
      where: {
        weekStart: { gte: weekStart },
        aiFeedbackGenerated: true,
      },
    });

    const blockedFeedback = await prisma.kpiWeek.count({
      where: {
        weekStart: { gte: weekStart },
        aiFeedbackBlocked: true,
      },
    });

    // 6. WhatsApp Stats
    const whatsappSent = await prisma.communicationLog.count({
      where: {
        channel: "WHATSAPP",
        sent: true,
        createdAt: { gte: oneDayAgo },
      },
    });

    const whatsappFailed = await prisma.communicationLog.count({
      where: {
        channel: "WHATSAPP",
        sent: false,
        createdAt: { gte: oneDayAgo },
      },
    });

    // 7. Recent automation triggers
    const recentAutomations = await prisma.automationLog.findMany({
      where: {
        firedAt: { gte: oneDayAgo },
        ruleId: { not: "CRON" },
        triggered: true,
      },
      select: { ruleId: true, ruleName: true },
    });

    const automationCounts: Record<string, number> = {};
    for (const log of recentAutomations) {
      automationCounts[log.ruleId] = (automationCounts[log.ruleId] || 0) + 1;
    }

    // Build analysis prompt for GPT
    const systemData = {
      timestamp: now.toISOString(),
      cronjobs: {
        description: "Anzahl Ausführungen in den letzten 24h",
        sendFeedback: `${cronStatus.sendFeedback} (sollte ~288 sein, alle 5 Min)`,
        weeklyReminders: `${cronStatus.weeklyReminders} (sollte 2 sein, 6:00 + 19:00)`,
        scheduledAutomations: `${cronStatus.scheduledAutomations} (sollte 0-1 sein, nur Dienstag 09:00)`,
        kpiReminder: `${cronStatus.kpiReminder} (sollte 0-2 sein, Mo 08:05 + 18:02)`,
      },
      errors: {
        count: errorLogs.length,
        recent: errorLogs.slice(0, 3).map((l) => ({ rule: l.ruleId, name: l.ruleName })),
      },
      tasks: {
        pending: pendingTasks,
        urgent: urgentTasks,
        overdue: overdueTasks,
      },
      members: memberStats,
      kpis: {
        thisWeek: kpisThisWeek,
        withFeedback: kpisWithFeedback,
        blocked: blockedFeedback,
        feedbackRate: kpisThisWeek > 0 ? Math.round((kpisWithFeedback / kpisThisWeek) * 100) : 0,
      },
      whatsapp: {
        sent: whatsappSent,
        failed: whatsappFailed,
        successRate: whatsappSent + whatsappFailed > 0 
          ? Math.round((whatsappSent / (whatsappSent + whatsappFailed)) * 100) 
          : 100,
      },
      automations: automationCounts,
    };

    // Call GPT-5.2 for analysis
    let aiSummary = "";
    let healthStatus: "OK" | "WARNING" | "ERROR" = "OK";
    const issues: string[] = [];

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-5.2",
        messages: [
          {
            role: "system",
            content: `Du bist ein System-Überwacher für ein CRM-System. Analysiere die folgenden System-Daten und erstelle eine kurze, prägnante Zusammenfassung.

AUFGABE:
1. Identifiziere Probleme oder Anomalien
2. Gib eine kurze Bewertung: OK, WARNUNG oder FEHLER
3. Schreibe max. 3-4 Sätze als Zusammenfassung
4. Liste wichtige Punkte auf die Aufmerksamkeit brauchen

FORMAT:
Status: [OK/WARNUNG/FEHLER]
Zusammenfassung: [Kurze Zusammenfassung]
Wichtig: [Falls Probleme vorhanden, liste sie auf]

REGELN:
- Sei präzise und technisch korrekt
- Fokussiere auf das Wesentliche
- Wenn alles normal läuft, sag das kurz
- Sprache: Deutsch`,
          },
          {
            role: "user",
            content: `Hier sind die aktuellen System-Daten:\n\n${JSON.stringify(systemData, null, 2)}`,
          },
        ],
        max_completion_tokens: 500,
        temperature: 0.3,
      });

      aiSummary = response.choices[0]?.message?.content || "Keine Analyse verfügbar";

      // Parse status from AI response
      if (aiSummary.includes("FEHLER") || aiSummary.includes("ERROR")) {
        healthStatus = "ERROR";
      } else if (aiSummary.includes("WARNUNG") || aiSummary.includes("WARNING")) {
        healthStatus = "WARNING";
      }
    } catch (aiError) {
      console.error("AI analysis failed:", aiError);
      aiSummary = "KI-Analyse fehlgeschlagen. Manuelle Prüfung empfohlen.";
      healthStatus = "WARNING";
      issues.push("OpenAI API nicht erreichbar");
    }

    // Check for obvious issues
    // sendFeedback should run ~288 times per day (every 5 minutes)
    // But it only logs when it actually runs, so if there's no feedback to send, it might be lower
    // We check if it's completely missing (0) or very low (< 50) which would indicate a problem
    if (cronStatus.sendFeedback === 0) {
      issues.push("Send-Feedback Cronjob wurde in den letzten 24h nicht ausgeführt");
      healthStatus = "ERROR";
    } else if (cronStatus.sendFeedback < 50) {
      issues.push(`Send-Feedback Cronjob läuft unregelmäßig (${cronStatus.sendFeedback} statt ~288)`);
      healthStatus = "WARNING";
    }
    
    // weeklyReminders should run 2x per day (06:00 + 19:00)
    if (cronStatus.weeklyReminders === 0) {
      issues.push("Weekly-Reminders Cronjob wurde in den letzten 24h nicht ausgeführt");
      healthStatus = "WARNING";
    }
    if (overdueTasks > 5) {
      issues.push(`${overdueTasks} überfällige Tasks`);
      healthStatus = "WARNING";
    }
    if (whatsappFailed > 5) {
      issues.push(`${whatsappFailed} WhatsApp-Nachrichten fehlgeschlagen`);
      healthStatus = "WARNING";
    }
    if (memberStats.churnRisk > memberStats.total * 0.2) {
      issues.push(`Hohe Churn-Risk Quote: ${memberStats.churnRisk}/${memberStats.total}`);
      healthStatus = "WARNING";
    }

    // Save health check result
    await prisma.automationLog.create({
      data: {
        ruleId: "SYSTEM_HEALTH",
        ruleName: "System Health Check",
        triggered: true,
        actionsTaken: issues.length > 0 ? issues : ["Keine Probleme erkannt"],
        details: {
          status: healthStatus,
          summary: aiSummary,
          data: systemData,
          issues,
        },
      },
    });

    return NextResponse.json({
      success: true,
      status: healthStatus,
      summary: aiSummary,
      issues,
      data: systemData,
    });
  } catch (error) {
    console.error("System health check failed:", error);

    // Log the failure
    await prisma.automationLog.create({
      data: {
        ruleId: "SYSTEM_HEALTH",
        ruleName: "System Health Check",
        triggered: false,
        actionsTaken: ["Health Check fehlgeschlagen"],
        details: { error: String(error) },
      },
    });

    return NextResponse.json(
      { error: "Health check failed", details: String(error) },
      { status: 500 }
    );
  }
}

