import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";

// This endpoint sends a daily summary to all ADMIN and SUPER_ADMIN users
// Recommended schedule: Every day at configured time (default 08:00)
// Cron: 0 8 * * *

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if admin digest is enabled
    const settings = await prisma.systemSettings.findFirst({
      where: { id: "default" },
    });

    if (!settings?.adminEmailDigest) {
      return NextResponse.json({
        success: true,
        message: "Admin digest is disabled",
        sent: 0,
      });
    }

    // Get yesterday's date range for stats
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Get all admins (ADMIN and SUPER_ADMIN) who have daily summary enabled
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
        message: "No active admins found",
        sent: 0,
      });
    }

    // Gather statistics

    // 1. KPIs submitted yesterday
    const kpisSubmitted = await prisma.kpiWeek.findMany({
      where: {
        submittedAt: {
          gte: yesterday,
          lt: todayStart,
        },
      },
      include: {
        member: {
          select: {
            vorname: true,
            nachname: true,
          },
        },
      },
    });

    // 2. Calculate average performance
    let totalPerformance = 0;
    let kpisWithPerformance = 0;
    const performanceDetails: Array<{
      name: string;
      performance: number;
      umsatzIst: number;
      umsatzSoll: number;
    }> = [];

    for (const kpi of kpisSubmitted) {
      if (kpi.umsatzIst && kpi.umsatzSollWoche) {
        const performance = Number(kpi.umsatzIst) / Number(kpi.umsatzSollWoche) * 100;
        totalPerformance += performance;
        kpisWithPerformance++;
        performanceDetails.push({
          name: `${kpi.member.vorname} ${kpi.member.nachname}`,
          performance: Math.round(performance),
          umsatzIst: Number(kpi.umsatzIst),
          umsatzSoll: Number(kpi.umsatzSollWoche),
        });
      }
    }

    const avgPerformance = kpisWithPerformance > 0
      ? Math.round(totalPerformance / kpisWithPerformance)
      : 0;

    // 3. Tasks created yesterday
    const tasksCreated = await prisma.task.findMany({
      where: {
        createdAt: {
          gte: yesterday,
          lt: todayStart,
        },
      },
      include: {
        member: {
          select: { vorname: true, nachname: true },
        },
        assignedTo: {
          select: { vorname: true, nachname: true },
        },
      },
    });

    // 4. Open tasks count
    const openTasksCount = await prisma.task.count({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
    });

    // 5. Members who didn't submit this week (churn risk)
    const currentWeekStart = getMonday(now);
    const membersWithoutKpi = await prisma.member.count({
      where: {
        status: "AKTIV",
        kpiTrackingActive: true,
        kpiWeeks: {
          none: {
            weekStart: currentWeekStart,
          },
        },
      },
    });

    // 6. Total active members
    const activeMembersCount = await prisma.member.count({
      where: {
        status: "AKTIV",
        kpiTrackingActive: true,
      },
    });

    // Format the date for display
    const dateStr = yesterday.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // Build email content
    const emailHtml = buildSummaryEmail({
      dateStr,
      kpisSubmitted: kpisSubmitted.length,
      avgPerformance,
      performanceDetails: performanceDetails.slice(0, 10), // Top 10
      tasksCreated: tasksCreated.length,
      openTasksCount,
      membersWithoutKpi,
      activeMembersCount,
      tasksList: tasksCreated.slice(0, 5), // Top 5 new tasks
    });

    // Build WhatsApp message (shorter version)
    const whatsappMessage = buildSummaryWhatsApp({
      dateStr,
      kpisSubmitted: kpisSubmitted.length,
      avgPerformance,
      tasksCreated: tasksCreated.length,
      openTasksCount,
      membersWithoutKpi,
      activeMembersCount,
    });

    // Send to all admins
    const results = {
      emailsSent: 0,
      whatsappSent: 0,
      errors: [] as string[],
    };

    for (const admin of admins) {
      // Send email
      try {
        const sent = await sendEmail({
          to: admin.email,
          subject: `📊 Tägliche Zusammenfassung - ${dateStr}`,
          html: emailHtml,
        });
        if (sent) results.emailsSent++;
      } catch (error) {
        results.errors.push(`Email to ${admin.vorname}: ${error}`);
      }

      // Send WhatsApp if number is available
      if (admin.whatsappNummer) {
        try {
          // Note: sendWhatsApp requires memberId, but for admin notifications
          // we don't have a member - we'll log without memberId
          const sent = await sendWhatsAppToAdmin(admin.whatsappNummer, whatsappMessage);
          if (sent) results.whatsappSent++;
        } catch (error) {
          results.errors.push(`WhatsApp to ${admin.vorname}: ${error}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Daily summary sent to ${admins.length} admins`,
      results,
      stats: {
        kpisSubmitted: kpisSubmitted.length,
        avgPerformance,
        tasksCreated: tasksCreated.length,
        openTasksCount,
      },
    });
  } catch (error) {
    console.error("Daily summary cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support POST for some cron services
export async function POST(request: NextRequest) {
  return GET(request);
}

// Helper: Get Monday of the current week
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper: Send WhatsApp to admin (without member logging)
async function sendWhatsAppToAdmin(phone: string, message: string): Promise<boolean> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!apiUrl || !apiKey) {
    console.warn("WhatsApp API not configured");
    return false;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ phone, message }),
    });

    return response.ok;
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return false;
  }
}

// Build HTML email for daily summary
function buildSummaryEmail(data: {
  dateStr: string;
  kpisSubmitted: number;
  avgPerformance: number;
  performanceDetails: Array<{ name: string; performance: number; umsatzIst: number; umsatzSoll: number }>;
  tasksCreated: number;
  openTasksCount: number;
  membersWithoutKpi: number;
  activeMembersCount: number;
  tasksList: Array<{ title: string; member?: { vorname: string; nachname: string } | null; priority: string }>;
}): string {
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  const performanceColor = data.avgPerformance >= 100 ? "#16a34a" : data.avgPerformance >= 80 ? "#ca8a04" : "#ae1d2b";

  const performanceRows = data.performanceDetails
    .sort((a, b) => b.performance - a.performance)
    .map(p => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${p.name}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${p.umsatzIst.toLocaleString("de-DE")}€</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; text-align: right; color: ${p.performance >= 100 ? "#16a34a" : p.performance >= 80 ? "#ca8a04" : "#ae1d2b"}; font-weight: 600;">${p.performance}%</td>
      </tr>
    `).join("");

  const taskRows = data.tasksList.map(t => `
    <li style="margin-bottom: 8px;">
      <strong>${t.title}</strong>
      ${t.member ? `<br><span style="color: #6b6b6b;">Mitglied: ${t.member.vorname} ${t.member.nachname}</span>` : ""}
    </li>
  `).join("");

  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #ffffff; padding: 24px 32px; text-align: center; border-bottom: 1px solid #e5e5e5;">
          <img src="${appUrl}/nf-logo.png" alt="NF Mentoring" style="max-height: 50px; width: auto;" />
        </div>

        <div style="padding: 32px;">
          <h1 style="font-size: 24px; margin: 0 0 8px 0;">📊 Tägliche Zusammenfassung</h1>
          <p style="color: #6b6b6b; margin: 0 0 24px 0;">${data.dateStr}</p>

          <!-- Overview Cards -->
          <div style="display: flex; gap: 16px; margin-bottom: 24px;">
            <div style="flex: 1; background: #f8f8f8; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: #1a1a1a;">${data.kpisSubmitted}</div>
              <div style="color: #6b6b6b; font-size: 14px;">KPIs eingereicht</div>
            </div>
            <div style="flex: 1; background: #f8f8f8; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: ${performanceColor};">${data.avgPerformance}%</div>
              <div style="color: #6b6b6b; font-size: 14px;">Ø Zielerreichung</div>
            </div>
          </div>

          <!-- Status Bar -->
          <div style="background: linear-gradient(135deg, #fdf2f3 0%, #fff5f5 100%); border-left: 4px solid #ae1d2b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
              <div>
                <strong>${data.tasksCreated}</strong> neue Tasks erstellt<br>
                <strong>${data.openTasksCount}</strong> offene Tasks gesamt
              </div>
              <div>
                <strong>${data.membersWithoutKpi}</strong> von ${data.activeMembersCount} ohne KPIs diese Woche
              </div>
            </div>
          </div>

          ${data.performanceDetails.length > 0 ? `
            <!-- Performance Table -->
            <h2 style="font-size: 18px; margin: 24px 0 16px 0;">KPI Übersicht</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: #f8f8f8;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e5e5;">Mitglied</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e5e5;">Umsatz</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e5e5;">Erreicht</th>
                </tr>
              </thead>
              <tbody>
                ${performanceRows}
              </tbody>
            </table>
          ` : ""}

          ${data.tasksList.length > 0 ? `
            <!-- New Tasks -->
            <h2 style="font-size: 18px; margin: 24px 0 16px 0;">Neue Tasks</h2>
            <ul style="margin: 0; padding-left: 20px;">
              ${taskRows}
            </ul>
          ` : ""}

          <div style="text-align: center; margin-top: 32px;">
            <a href="${appUrl}/dashboard" style="display: inline-block; background: #ae1d2b; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Dashboard öffnen
            </a>
          </div>
        </div>

        <div style="background: #f8f8f8; padding: 24px 32px; text-align: center; color: #6b6b6b; font-size: 14px;">
          <p>Diese E-Mail wurde automatisch generiert.</p>
          <p style="margin-top: 8px;">
            <a href="${appUrl}/einstellungen" style="color: #ae1d2b; text-decoration: none;">Benachrichtigungen verwalten</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Build WhatsApp message for daily summary
function buildSummaryWhatsApp(data: {
  dateStr: string;
  kpisSubmitted: number;
  avgPerformance: number;
  tasksCreated: number;
  openTasksCount: number;
  membersWithoutKpi: number;
  activeMembersCount: number;
}): string {
  const emoji = data.avgPerformance >= 100 ? "🎉" : data.avgPerformance >= 80 ? "👍" : "📊";

  return `${emoji} *Tägliche Zusammenfassung*
${data.dateStr}

📈 *KPIs gestern:* ${data.kpisSubmitted} eingereicht
📊 *Ø Zielerreichung:* ${data.avgPerformance}%

📋 *Tasks:* ${data.tasksCreated} neue, ${data.openTasksCount} offen
⚠️ *Ohne KPIs:* ${data.membersWithoutKpi}/${data.activeMembersCount} Mitglieder`;
}
