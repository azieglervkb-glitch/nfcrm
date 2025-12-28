/**
 * Onboarding Notification & Reminder Management
 * Handles sending onboarding emails/WhatsApp and reminder logic
 */

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp, isInQuietHours } from "@/lib/whatsapp";
import { generateFormUrl, getAppUrl } from "@/lib/app-url";
import { randomBytes } from "crypto";

interface MemberForOnboarding {
  id: string;
  email: string;
  vorname: string;
  nachname: string;
  whatsappNummer: string | null;
}

/**
 * Send initial onboarding notification (Email + WhatsApp)
 * Called when a member is created (via Copecart or manually)
 */
export async function sendOnboardingNotification(
  member: MemberForOnboarding
): Promise<{ emailSent: boolean; whatsappSent: boolean; token: string }> {
  // Create onboarding token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.formToken.create({
    data: {
      token,
      type: "onboarding",
      memberId: member.id,
      expiresAt,
    },
  });

  const onboardingUrl = generateFormUrl("onboarding", token);

  // Send Email
  const emailSent = await sendEmail({
    to: member.email,
    subject: "🚀 Willkommen beim NF Mentoring!",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ae1d2b 0%, #8a1722 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Willkommen beim NF Mentoring!</h1>
        </div>
        <div style="background: #ffffff; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 18px; color: #111827;">Hallo ${member.vorname}! 👋</p>
          <p style="color: #6b7280; line-height: 1.6;">
            Vielen Dank für deine Anmeldung zum NF Mentoring. Wir freuen uns riesig, dich auf deinem Weg zu unterstützen!
          </p>
          <p style="color: #6b7280; line-height: 1.6;">
            <strong>Dein erster Schritt:</strong> Fülle bitte das kurze Onboarding-Formular aus, damit wir dich besser kennenlernen können.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${onboardingUrl}" style="background: #ae1d2b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Onboarding starten →
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">
            Dauert nur 2 Minuten! Der Link ist 7 Tage gültig.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 14px; text-align: center;">
            NF Mentoring | <a href="${getAppUrl()}" style="color: #ae1d2b;">nf-mentoring.de</a>
          </p>
        </div>
      </div>
    `,
  });

  // Send WhatsApp (if phone number available)
  let whatsappSent = false;
  if (member.whatsappNummer) {
    try {
      await sendWhatsApp({
        phone: member.whatsappNummer,
        message: `Hey ${member.vorname}! 👋\n\nWillkommen beim NF Mentoring! 🚀\n\nBitte fülle kurz dein Onboarding aus, damit wir dich besser kennenlernen können:\n\n${onboardingUrl}\n\nDauert nur 2 Minuten! 💪`,
        memberId: member.id,
        type: "MANUAL",
        ruleId: "ONBOARDING",
      });
      whatsappSent = true;
    } catch (error) {
      console.error(`Failed to send onboarding WhatsApp to ${member.whatsappNummer}:`, error);
    }
  }

  // Update member
  await prisma.member.update({
    where: { id: member.id },
    data: {
      onboardingSentAt: new Date(),
    },
  });

  // Log automation
  await prisma.automationLog.create({
    data: {
      memberId: member.id,
      ruleId: "ONBOARDING",
      ruleName: "Onboarding Notification",
      triggered: true,
      actionsTaken: [
        "CREATE_ONBOARDING_TOKEN",
        emailSent ? "SEND_ONBOARDING_EMAIL" : "EMAIL_FAILED",
        ...(member.whatsappNummer ? [whatsappSent ? "SEND_ONBOARDING_WHATSAPP" : "WHATSAPP_FAILED"] : []),
      ],
    },
  });

  return { emailSent, whatsappSent, token };
}

/**
 * Send onboarding reminders for members who haven't completed onboarding
 * Called by cronjob
 */
export async function sendOnboardingReminders(): Promise<{
  processed: number;
  reminded: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    processed: 0,
    reminded: 0,
    skipped: 0,
    errors: [] as string[],
  };

  // Get settings
  const settings = await prisma.systemSettings.findFirst();
  const reminderDays = settings?.onboardingReminderDays || [1, 3, 7];
  const maxReminders = reminderDays.length;

  // Find members who:
  // - Have onboardingSentAt but NOT onboardingCompleted
  // - Haven't reached max reminders
  // - Are due for a reminder based on reminderDays
  const members = await prisma.member.findMany({
    where: {
      onboardingSentAt: { not: null },
      onboardingCompleted: false,
      onboardingReminderCount: { lt: maxReminders },
      status: "AKTIV",
    },
    select: {
      id: true,
      email: true,
      vorname: true,
      nachname: true,
      whatsappNummer: true,
      onboardingSentAt: true,
      onboardingReminderCount: true,
      onboardingLastReminderAt: true,
    },
  });

  const now = new Date();

  for (const member of members) {
    result.processed++;

    if (!member.onboardingSentAt) {
      result.skipped++;
      continue;
    }

    const daysSinceSent = Math.floor(
      (now.getTime() - member.onboardingSentAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check if we should send a reminder today
    const nextReminderDay = reminderDays[member.onboardingReminderCount];
    if (daysSinceSent < nextReminderDay) {
      result.skipped++;
      continue;
    }

    // Check if already reminded today
    if (member.onboardingLastReminderAt) {
      const lastReminderDate = member.onboardingLastReminderAt.toDateString();
      if (lastReminderDate === now.toDateString()) {
        result.skipped++;
        continue;
      }
    }

    // Check quiet hours for WhatsApp
    if (await isInQuietHours()) {
      result.skipped++;
      continue;
    }

    try {
      // Get valid onboarding token or create new one
      let formToken = await prisma.formToken.findFirst({
        where: {
          memberId: member.id,
          type: "onboarding",
          expiresAt: { gt: now },
        },
      });

      if (!formToken) {
        const token = randomBytes(32).toString("hex");
        formToken = await prisma.formToken.create({
          data: {
            token,
            type: "onboarding",
            memberId: member.id,
            expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }

      const onboardingUrl = generateFormUrl("onboarding", formToken.token);
      const reminderNumber = member.onboardingReminderCount + 1;

      // Send reminder email
      await sendEmail({
        to: member.email,
        subject: `⏰ Erinnerung: Dein NF Mentoring Onboarding wartet!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #ffffff; padding: 40px 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <p style="font-size: 18px; color: #111827;">Hey ${member.vorname}! 👋</p>
              <p style="color: #6b7280; line-height: 1.6;">
                Kurze Erinnerung: Du hast dein Onboarding noch nicht abgeschlossen.
              </p>
              <p style="color: #6b7280; line-height: 1.6;">
                Das dauert nur 2 Minuten und hilft uns, dich optimal zu unterstützen!
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${onboardingUrl}" style="background: #ae1d2b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Jetzt Onboarding abschließen →
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 14px; text-align: center;">
                NF Mentoring | <a href="${getAppUrl()}" style="color: #ae1d2b;">nf-mentoring.de</a>
              </p>
            </div>
          </div>
        `,
      });

      // Send WhatsApp reminder
      if (member.whatsappNummer) {
        await sendWhatsApp({
          phone: member.whatsappNummer,
          message: `Hey ${member.vorname}! 👋\n\nKurze Erinnerung: Du hast dein Onboarding noch nicht abgeschlossen. Dauert nur 2 Min:\n\n${onboardingUrl}`,
          memberId: member.id,
          type: "REMINDER",
          ruleId: "ONBOARDING_REMINDER",
        }).catch((error) => {
          console.error(`Failed to send onboarding reminder WhatsApp:`, error);
        });
      }

      // Update member
      await prisma.member.update({
        where: { id: member.id },
        data: {
          onboardingReminderCount: reminderNumber,
          onboardingLastReminderAt: now,
        },
      });

      // Log
      await prisma.automationLog.create({
        data: {
          memberId: member.id,
          ruleId: "ONBOARDING_REMINDER",
          ruleName: `Onboarding Reminder ${reminderNumber}`,
          triggered: true,
          actionsTaken: [
            "SEND_REMINDER_EMAIL",
            member.whatsappNummer ? "SEND_REMINDER_WHATSAPP" : "NO_WHATSAPP",
          ],
          details: {
            reminderNumber,
            daysSinceSent,
          },
        },
      });

      result.reminded++;
    } catch (error) {
      result.errors.push(`${member.email}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return result;
}

