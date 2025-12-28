/**
 * KPI Tracking Activation & Management
 * Handles activation, reminders, and LearninSuite integration
 */

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp, isInQuietHours } from "@/lib/whatsapp";
import { generateFormUrl } from "@/lib/app-url";
import { randomBytes } from "crypto";

/**
 * Activate KPI tracking for a member
 * Creates KPI setup token and sends email/WhatsApp
 */
export async function activateKpiTracking(
  memberId: string,
  source: "manual" | "learningsuite_api" = "manual"
): Promise<void> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      email: true,
      vorname: true,
      nachname: true,
      whatsappNummer: true,
      kpiTrackingEnabled: true,
      kpiSetupCompleted: true,
    },
  });

  if (!member) {
    throw new Error(`Member ${memberId} not found`);
  }

  // Don't activate if already enabled
  if (member.kpiTrackingEnabled) {
    return;
  }

  // Don't activate if setup already completed
  if (member.kpiSetupCompleted) {
    return;
  }

  // Create KPI setup token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.formToken.create({
    data: {
      token,
      type: "kpi-setup",
      memberId: member.id,
      expiresAt,
    },
  });

  const kpiSetupUrl = generateFormUrl("kpi-setup", token);

  // Update member
  await prisma.member.update({
    where: { id: memberId },
    data: {
      kpiTrackingEnabled: true,
      kpiTrackingEnabledAt: new Date(),
      kpiSetupSentAt: new Date(),
      kpiSetupReminderCount: 0,
    },
  });

  // Send email
  await sendEmail({
    to: member.email,
    subject: "🚀 Starte dein persönliches KPI-Tracking",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ae1d2b 0%, #8a1722 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Starte dein KPI-Tracking!</h1>
        </div>
        <div style="background: #ffffff; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 18px; color: #111827;">Hey ${member.vorname}! 👋</p>
          <p style="color: #6b7280; line-height: 1.6;">
            Jetzt ist es Zeit, dein persönliches KPI-Tracking einzurichten. 
            So können wir deine Fortschritte optimal begleiten und dir gezielt helfen.
          </p>
          <p style="color: #6b7280; line-height: 1.6;">
            <strong>Was dich erwartet:</strong>
          </p>
          <ul style="color: #6b7280; line-height: 1.8;">
            <li>Wöchentliches KPI-Tracking mit persönlichem Feedback</li>
            <li>Automatische Erinnerungen, damit nichts vergessen wird</li>
            <li>Detaillierte Auswertungen deiner Performance</li>
            <li>Konkrete Handlungsempfehlungen basierend auf deinen Zahlen</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${kpiSetupUrl}" style="background: #ae1d2b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              KPI-Tracking einrichten →
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">
            Der Link ist 7 Tage gültig. Dauert nur 5 Minuten!
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 14px; text-align: center;">
            NF Mentoring | <a href="https://nf-mentoring.de" style="color: #ae1d2b;">nf-mentoring.de</a>
          </p>
        </div>
      </div>
    `,
  }).catch((error) => {
    console.error(`Failed to send KPI setup email to ${member.email}:`, error);
  });

  // Send WhatsApp (if number available and not in quiet hours)
  if (member.whatsappNummer) {
    const quietHours = await isInQuietHours();
    if (!quietHours) {
      await sendWhatsApp({
        phone: member.whatsappNummer,
        message: `Hey ${member.vorname}! 👋\n\nJetzt ist es Zeit, dein KPI-Tracking einzurichten. So können wir deine Fortschritte optimal begleiten!\n\nHier geht's zum Setup: ${kpiSetupUrl}\n\nDauert nur 5 Minuten! 🚀`,
        memberId: member.id,
        type: "REMINDER",
        ruleId: "KPI_SETUP",
      }).catch((error) => {
        console.error(`Failed to send KPI setup WhatsApp to ${member.whatsappNummer}:`, error);
      });
    }
  }

  // Log automation
  await prisma.automationLog.create({
    data: {
      memberId: member.id,
      ruleId: source === "learningsuite_api" ? "LEARNINSUITE" : "MANUAL",
      ruleName: "KPI Tracking Activated",
      triggered: true,
      actionsTaken: [
        "ACTIVATE_KPI_TRACKING",
        "CREATE_KPI_SETUP_TOKEN",
        "SEND_KPI_SETUP_EMAIL",
        member.whatsappNummer ? "SEND_KPI_SETUP_WHATSAPP" : "SKIP_WHATSAPP_NO_NUMBER",
      ],
      details: {
        source,
        kpiSetupUrl,
        activatedAt: new Date().toISOString(),
      },
    },
  }).catch((error) => {
    console.error("Failed to create automation log:", error);
  });
}

/**
 * Send KPI setup reminder to a member
 */
export async function sendKpiSetupReminder(
  memberId: string,
  channel: "email" | "whatsapp"
): Promise<void> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      email: true,
      vorname: true,
      whatsappNummer: true,
      kpiTrackingEnabled: true,
      kpiSetupCompleted: true,
      kpiSetupReminderCount: true,
    },
  });

  if (!member || !member.kpiTrackingEnabled || member.kpiSetupCompleted) {
    return;
  }

  // Get existing token or create new one
  let formToken = await prisma.formToken.findFirst({
    where: {
      memberId: member.id,
      type: "kpi-setup",
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });

  if (!formToken) {
    const token = randomBytes(32).toString("hex");
    formToken = await prisma.formToken.create({
      data: {
        token,
        type: "kpi-setup",
        memberId: member.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  const kpiSetupUrl = generateFormUrl("kpi-setup", formToken.token);

  if (channel === "email" && member.email) {
    await sendEmail({
      to: member.email,
      subject: "⏰ Erinnerung: KPI-Tracking einrichten",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #ffffff; padding: 40px 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <p style="font-size: 18px; color: #111827;">Hey ${member.vorname}! 👋</p>
            <p style="color: #6b7280; line-height: 1.6;">
              Kurze Erinnerung: Du hast dein KPI-Tracking noch nicht eingerichtet.
            </p>
            <p style="color: #6b7280; line-height: 1.6;">
              Das dauert nur 5 Minuten und hilft uns, dich optimal zu unterstützen!
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${kpiSetupUrl}" style="background: #ae1d2b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Jetzt einrichten →
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 14px; text-align: center;">
              NF Mentoring | <a href="https://nf-mentoring.de" style="color: #ae1d2b;">nf-mentoring.de</a>
            </p>
          </div>
        </div>
      `,
    }).catch((error) => {
      console.error(`Failed to send KPI setup reminder email:`, error);
    });
  }

  if (channel === "whatsapp" && member.whatsappNummer) {
    const quietHours = await isInQuietHours();
    if (!quietHours) {
      await sendWhatsApp({
        phone: member.whatsappNummer,
        message: `Hey ${member.vorname}! 👋\n\nKurze Erinnerung: Du hast dein KPI-Tracking noch nicht eingerichtet. Dauert nur 5 Min: ${kpiSetupUrl}`,
        memberId: member.id,
        type: "REMINDER",
        ruleId: "KPI_SETUP_REMINDER",
      }).catch((error) => {
        console.error(`Failed to send KPI setup reminder WhatsApp:`, error);
      });
    }
  }
}

/**
 * Check and send KPI setup reminders based on settings
 */
export async function checkKpiSetupReminders(): Promise<void> {
  const settings = await prisma.systemSettings.findFirst({
    where: { id: "default" },
  });

  if (!settings) {
    return;
  }

  const reminderDays = settings.kpiSetupReminderDays || [1, 3, 7];
  const now = new Date();

  // Find members who need reminders
  const pendingMembers = await prisma.member.findMany({
    where: {
      kpiTrackingEnabled: true,
      kpiSetupCompleted: false,
      kpiSetupReminderCount: { lt: reminderDays.length },
    },
  });

  for (const member of pendingMembers) {
    if (!member.kpiTrackingEnabledAt) {
      continue;
    }

    const daysSinceEnabled = Math.floor(
      (now.getTime() - member.kpiTrackingEnabledAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const reminderIndex = member.kpiSetupReminderCount;
    const nextReminderDay = reminderDays[reminderIndex];

    if (daysSinceEnabled >= nextReminderDay) {
      // Send both email and WhatsApp
      await sendKpiSetupReminder(member.id, "email");
      await sendKpiSetupReminder(member.id, "whatsapp");

      // Update reminder count
      await prisma.member.update({
        where: { id: member.id },
        data: {
          kpiSetupReminderCount: { increment: 1 },
          kpiSetupLastReminderAt: new Date(),
        },
      });
    }
  }
}

