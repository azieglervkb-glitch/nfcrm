import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, wrapEmailTemplate, renderTemplate } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";
import { getAppUrl, generateLogoUrl } from "@/lib/app-url";
import { getCurrentWeekStart, getWeekInfo, getPreviousWeek } from "@/lib/date-utils";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Get current time in Europe/Berlin timezone
 */
function getBerlinTime(): Date {
  const now = new Date();
  const berlinTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  return berlinTime;
}

/**
 * Determine which week to show in the daily summary based on the tracking window logic:
 * - Saturday/Sunday: Show CURRENT week (members are tracking this week)
 * - Monday-Friday: Show PREVIOUS week (last tracked week / will be tracked starting Friday)
 */
function getTargetWeekForSummary(): Date {
  const now = getBerlinTime();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  const currentWeekStart = getCurrentWeekStart();

  if (dayOfWeek === 6 || dayOfWeek === 0) {
    // Saturday or Sunday - show current week (what members are currently tracking)
    return currentWeekStart;
  } else {
    // Monday to Friday - show previous week (last tracked week)
    return getPreviousWeek(currentWeekStart);
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    // Use the target week based on tracking window logic
    // Saturday/Sunday: current week, Monday-Friday: previous week
    const weekStart = getTargetWeekForSummary();
    const { weekNumber, year } = getWeekInfo(weekStart);

    // Get all ADMIN and SUPER_ADMIN users who want daily summaries
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
        isActive: true,
        notifyDailySummary: true,
      },
      select: {
        id: true,
        email: true,
        vorname: true,
        whatsappNummer: true,
      },
    });

    if (admins.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Keine Admins für Daily Summary gefunden",
        sent: 0,
      });
    }

    // Gather statistics for today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // KPIs submitted today
    const kpisToday = await prisma.kpiWeek.count({
      where: {
        submittedAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // KPIs submitted this week
    const kpisThisWeek = await prisma.kpiWeek.count({
      where: {
        weekStart,
      },
    });

    // Average performance this week (umsatz)
    // Use goal snapshots stored at submission time for accurate historical performance
    const kpisWithUmsatz = await prisma.kpiWeek.findMany({
      where: {
        weekStart,
        umsatzIst: { not: null },
      },
      select: {
        umsatzIst: true,
        umsatzSollSnapshot: true, // Use snapshot instead of current member goal
      },
    });

    let avgPerformance = 0;
    if (kpisWithUmsatz.length > 0) {
      const performances = kpisWithUmsatz
        .filter(k => k.umsatzSollSnapshot && Number(k.umsatzSollSnapshot) > 0)
        .map(k => {
          const soll = Number(k.umsatzSollSnapshot);
          const ist = Number(k.umsatzIst);
          return (ist / soll) * 100;
        });

      if (performances.length > 0) {
        avgPerformance = Math.round(performances.reduce((a, b) => a + b, 0) / performances.length);
      }
    }

    // New tasks created today
    const newTasksToday = await prisma.task.count({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // Open tasks total
    const openTasks = await prisma.task.count({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
    });

    // Urgent tasks
    const urgentTasks = await prisma.task.count({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        priority: "URGENT",
      },
    });

    // Active members without KPIs this week
    const activeMembersWithKpiTracking = await prisma.member.count({
      where: {
        status: "AKTIV",
        kpiTrackingEnabled: true,
      },
    });

    const membersWithoutKpi = activeMembersWithKpiTracking - kpisThisWeek;

    // Build summary data
    const summary = {
      date: now.toLocaleDateString("de-DE", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      }),
      weekNumber,
      year,
      kpisToday,
      kpisThisWeek,
      avgPerformance,
      newTasksToday,
      openTasks,
      urgentTasks,
      membersWithoutKpi: Math.max(0, membersWithoutKpi),
      activeMembersWithKpiTracking,
    };

    const results = {
      emailsSent: 0,
      whatsappSent: 0,
      errors: [] as string[],
    };

    // Send to each admin
    for (const admin of admins) {
      // Send Email
      try {
        const emailSent = await sendDailySummaryEmail(admin, summary);
        if (emailSent) results.emailsSent++;
      } catch (error) {
        results.errors.push(`Email to ${admin.email}: ${error}`);
      }

      // Send WhatsApp if number exists
      if (admin.whatsappNummer) {
        try {
          const whatsappMessage = formatWhatsAppSummary(admin.vorname, summary);
          const sent = await sendWhatsApp({
            phone: admin.whatsappNummer,
            message: whatsappMessage,
            type: "ALERT",
            ruleId: "DAILY_SUMMARY",
          });
          if (sent) results.whatsappSent++;
        } catch (error) {
          results.errors.push(`WhatsApp to ${admin.vorname}: ${error}`);
        }
      }
    }

    // Log the cron run
    await prisma.automationLog.create({
      data: {
        ruleId: "CRON_DAILY_SUMMARY",
        ruleName: "Daily Summary for Admins",
        triggered: true,
        actionsTaken: [
          `${results.emailsSent} emails sent`,
          `${results.whatsappSent} WhatsApp messages sent`,
        ],
        details: { ...results, summary, adminCount: admins.length },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Daily Summary an ${admins.length} Admin(s) gesendet`,
      results,
      summary,
    });
  } catch (error) {
    console.error("Daily summary cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function sendDailySummaryEmail(
  admin: { email: string; vorname: string },
  summary: {
    date: string;
    weekNumber: number;
    kpisToday: number;
    kpisThisWeek: number;
    avgPerformance: number;
    newTasksToday: number;
    openTasks: number;
    urgentTasks: number;
    membersWithoutKpi: number;
    activeMembersWithKpiTracking: number;
  }
): Promise<boolean> {
  const performanceColor = summary.avgPerformance >= 100 ? "#16a34a" :
                           summary.avgPerformance >= 80 ? "#ca8a04" : "#ae1d2b";

  const content = `
    <div class="content">
      <p class="greeting">Guten Morgen, ${admin.vorname}! ☀️</p>

      <p class="text">
        Hier ist deine tägliche Zusammenfassung für <strong>${summary.date}</strong>
      </p>

      <div class="stats-box">
        <h3 style="margin: 0 0 16px 0; font-size: 16px;">📊 KPI-Tracking (KW ${summary.weekNumber})</h3>
        <div class="stats-row">
          <span class="stats-label">Heute eingereicht</span>
          <span class="stats-value">${summary.kpisToday}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Diese Woche gesamt</span>
          <span class="stats-value">${summary.kpisThisWeek} / ${summary.activeMembersWithKpiTracking}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Ø Performance</span>
          <span class="stats-value" style="color: ${performanceColor};">${summary.avgPerformance}%</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Noch ausstehend</span>
          <span class="stats-value" style="color: ${summary.membersWithoutKpi > 0 ? '#ca8a04' : '#16a34a'};">
            ${summary.membersWithoutKpi}
          </span>
        </div>
      </div>

      <div class="stats-box">
        <h3 style="margin: 0 0 16px 0; font-size: 16px;">📋 Tasks</h3>
        <div class="stats-row">
          <span class="stats-label">Neue Tasks heute</span>
          <span class="stats-value">${summary.newTasksToday}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Offene Tasks</span>
          <span class="stats-value">${summary.openTasks}</span>
        </div>
        ${summary.urgentTasks > 0 ? `
        <div class="stats-row">
          <span class="stats-label">🚨 Dringende Tasks</span>
          <span class="stats-value" style="color: #ae1d2b; font-weight: bold;">${summary.urgentTasks}</span>
        </div>
        ` : ''}
      </div>

      <div style="text-align: center;">
        <a href="${getAppUrl()}/dashboard" class="button">Dashboard öffnen</a>
      </div>
    </div>
  `;

  const html = wrapEmailTemplate(content);

  return sendEmail({
    to: admin.email,
    subject: `📊 Daily Summary - ${summary.date}`,
    html: renderTemplate(html, { appUrl: getAppUrl(), logoUrl: generateLogoUrl() }),
  });
}

function formatWhatsAppSummary(
  vorname: string,
  summary: {
    date: string;
    weekNumber: number;
    kpisToday: number;
    kpisThisWeek: number;
    avgPerformance: number;
    newTasksToday: number;
    openTasks: number;
    urgentTasks: number;
    membersWithoutKpi: number;
    activeMembersWithKpiTracking: number;
  }
): string {
  const lines: string[] = [];

  lines.push(`☀️ Guten Morgen, ${vorname}!`);
  lines.push("");
  lines.push(`📊 *Daily Summary* - ${summary.date}`);
  lines.push("");
  lines.push(`*KPI-Tracking (KW ${summary.weekNumber}):*`);
  lines.push(`• Heute eingereicht: ${summary.kpisToday}`);
  lines.push(`• Diese Woche: ${summary.kpisThisWeek}/${summary.activeMembersWithKpiTracking}`);
  lines.push(`• Ø Performance: ${summary.avgPerformance}%`);

  if (summary.membersWithoutKpi > 0) {
    lines.push(`• ⚠️ Noch ausstehend: ${summary.membersWithoutKpi}`);
  }

  lines.push("");
  lines.push(`*Tasks:*`);
  lines.push(`• Neue heute: ${summary.newTasksToday}`);
  lines.push(`• Offen: ${summary.openTasks}`);

  if (summary.urgentTasks > 0) {
    lines.push(`• 🚨 Dringend: ${summary.urgentTasks}`);
  }

  lines.push("");
  lines.push(`➡️ ${getAppUrl()}/dashboard`);

  return lines.join("\n");
}

// Also support POST for some cron services
export async function POST(request: NextRequest) {
  return GET(request);
}
