import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type CronLogConfig = {
  id: string;
  name: string;
  endpoint: string;
  schedule: string;
  logRuleId: string;
  logRuleName: string;
};

// Cronjob-Konfigurationen (Status basiert auf Cron-Run Logs)
const CRONJOBS: CronLogConfig[] = [
  {
    id: "kpi-reminder",
    name: "KPI Reminder",
    endpoint: "/api/cron/kpi-reminder",
    schedule: "Sonntag 18:00 + Montag 10:00",
    logRuleId: "CRON",
    logRuleName: "KPI Reminder Cron",
  },
  {
    id: "scheduled-automations",
    name: "Scheduled Automations",
    endpoint: "/api/cron/scheduled-automations",
    schedule: "Montag 9:00",
    logRuleId: "CRON",
    logRuleName: "Scheduled Automations",
  },
  {
    id: "send-feedback",
    name: "Send Feedback",
    endpoint: "/api/cron/send-feedback",
    schedule: "Alle 5 Minuten",
    logRuleId: "CRON_FEEDBACK",
    logRuleName: "Scheduled Feedback Sender",
  },
  {
    id: "weekly-reminders",
    name: "Weekly Reminders",
    endpoint: "/api/cron/weekly-reminders",
    schedule: "Täglich 6:00 + 19:00",
    logRuleId: "CRON",
    logRuleName: "Weekly Reminders",
  },
  {
    id: "system-health",
    name: "KI-Systemüberwacher",
    endpoint: "/api/cron/system-health",
    schedule: "Täglich 07:00",
    logRuleId: "SYSTEM_HEALTH",
    logRuleName: "System Health Check",
  },
];

export async function GET() {
  const session = await auth();

  // Nur Admins können den Status sehen
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cronjobStatuses = await Promise.all(
      CRONJOBS.map(async (cronjob) => {
        let lastExecution: Date | null = null;
        let lastSuccess: Date | null = null;
        let lastError: Date | null = null;
        let executionCount = 0;
        let successCount = 0;
        let errorCount = 0;

        const logs = await prisma.automationLog.findMany({
          where: {
            ruleId: cronjob.logRuleId,
            ruleName: cronjob.logRuleName,
          },
          orderBy: { firedAt: "desc" },
          take: 100,
        });

        if (logs.length > 0) {
          lastExecution = logs[0].firedAt;
          executionCount = logs.length;

          const successes = logs.filter((log) => log.triggered);
          const errors = logs.filter((log) => !log.triggered);

          successCount = successes.length;
          errorCount = errors.length;

          if (successes.length > 0) lastSuccess = successes[0].firedAt;
          if (errors.length > 0) lastError = errors[0].firedAt;
        }

        // Berechne Status
        let status: "healthy" | "warning" | "error" | "unknown" = "unknown";
        let statusMessage = "Keine Ausführungen gefunden";

        if (lastExecution) {
          const hoursSinceLastExecution =
            (Date.now() - lastExecution.getTime()) / (1000 * 60 * 60);

          if (cronjob.id === "send-feedback") {
            if (hoursSinceLastExecution < 1) {
              status = "healthy";
              statusMessage = "Läuft normal";
            } else if (hoursSinceLastExecution < 6) {
              status = "warning";
              statusMessage = "Lange keine Ausführung";
            } else {
              status = "error";
              statusMessage = "Keine Ausführung seit > 6 Stunden";
            }
          } else if (cronjob.id === "weekly-reminders") {
            if (hoursSinceLastExecution < 25) {
              status = "healthy";
              statusMessage = "Läuft normal";
            } else if (hoursSinceLastExecution < 48) {
              status = "warning";
              statusMessage = "Lange keine Ausführung";
            } else {
              status = "error";
              statusMessage = "Keine Ausführung seit > 48 Stunden";
            }
          } else if (cronjob.id === "kpi-reminder") {
            const daysSinceLastExecution = hoursSinceLastExecution / 24;
            if (daysSinceLastExecution < 8) {
              status = "healthy";
              statusMessage = "Läuft normal";
            } else if (daysSinceLastExecution < 14) {
              status = "warning";
              statusMessage = "Lange keine Ausführung";
            } else {
              status = "error";
              statusMessage = "Keine Ausführung seit > 14 Tagen";
            }
          } else if (cronjob.id === "scheduled-automations") {
            const daysSinceLastExecution = hoursSinceLastExecution / 24;
            if (daysSinceLastExecution < 8) {
              status = "healthy";
              statusMessage = "Läuft normal";
            } else if (daysSinceLastExecution < 14) {
              status = "warning";
              statusMessage = "Lange keine Ausführung";
            } else {
              status = "error";
              statusMessage = "Keine Ausführung seit > 14 Tagen";
            }
          } else if (cronjob.id === "system-health") {
            if (hoursSinceLastExecution < 26) {
              status = "healthy";
              statusMessage = "Läuft normal";
            } else if (hoursSinceLastExecution < 48) {
              status = "warning";
              statusMessage = "Lange keine Ausführung";
            } else {
              status = "error";
              statusMessage = "Keine Ausführung seit > 48 Stunden";
            }
          }

          // Wenn es Fehler gab, Status auf Warning setzen
          if (errorCount > 0 && status === "healthy") {
            status = "warning";
            statusMessage = `${errorCount} Fehler in letzter Zeit`;
          }
        }

        return {
          id: cronjob.id,
          name: cronjob.name,
          endpoint: cronjob.endpoint,
          schedule: cronjob.schedule,
          status,
          statusMessage,
          lastExecution: lastExecution?.toISOString() || null,
          lastSuccess: lastSuccess?.toISOString() || null,
          lastError: lastError?.toISOString() || null,
          executionCount,
          successCount,
          errorCount,
        };
      })
    );

    return NextResponse.json({ cronjobs: cronjobStatuses });
  } catch (error) {
    console.error("Error fetching cronjob status:", error);
    return NextResponse.json(
      { error: "Failed to fetch cronjob status" },
      { status: 500 }
    );
  }
}
