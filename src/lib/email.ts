import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { getAppUrl, generateLogoUrl } from "./app-url";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailOptions): Promise<boolean> {
  try {
    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.warn("SMTP not configured, skipping email send");
      return false;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "NF Mentoring <noreply@nf-mentoring.de>",
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    });
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

// Template rendering helper
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), String(value || ""));
  }
  return result;
}

// ==================== EMAIL TEMPLATES ====================

const EMAIL_STYLES = `
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #ffffff; padding: 24px 32px; text-align: center; border-bottom: 1px solid #e5e5e5; }
    .header img { max-height: 50px; width: auto; }
    .content { padding: 32px; }
    .greeting { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }
    .text { color: #4a4a4a; margin-bottom: 16px; }
    .button { display: inline-block; background: #ae1d2b; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
    .button:hover { background: #8a1722; }
    .stats-box { background: #f8f8f8; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .stats-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
    .stats-row:last-child { border-bottom: none; }
    .stats-label { color: #6b6b6b; }
    .stats-value { font-weight: 600; color: #1a1a1a; }
    .highlight-box { background: linear-gradient(135deg, #fdf2f3 0%, #fff5f5 100%); border-left: 4px solid #ae1d2b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0; }
    .footer { background: #f8f8f8; padding: 24px 32px; text-align: center; color: #6b6b6b; font-size: 14px; }
    .footer a { color: #ae1d2b; text-decoration: none; }
    .divider { height: 1px; background: #e5e5e5; margin: 24px 0; }
    .tip { background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .tip-title { color: #166534; font-weight: 600; margin-bottom: 8px; }
    .warning { background: #fef3c7; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .warning-title { color: #92400e; font-weight: 600; margin-bottom: 8px; }
  </style>
`;

const EMAIL_HEADER = `
  <div class="header" style="background: #ffffff; padding: 24px 32px; text-align: center; border-bottom: 1px solid #e5e5e5;">
    <img src="{{logoUrl}}" alt="NF Mentoring" width="150" height="auto" style="max-height: 50px; width: auto; display: block; margin: 0 auto;" />
  </div>
`;

const EMAIL_FOOTER = `
  <div class="footer">
    <p>Du erhältst diese E-Mail als Mitglied des NF Mentorings.</p>
    <p>
      <a href="{{appUrl}}">Dashboard öffnen</a> ·
      <a href="mailto:support@nf-mentoring.de">Support kontaktieren</a>
    </p>
    <p style="margin-top: 16px; color: #9a9a9a;">© ${new Date().getFullYear()} NF Mentoring. Alle Rechte vorbehalten.</p>
  </div>
`;

export function wrapEmailTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${EMAIL_STYLES}
    </head>
    <body>
      <div class="container">
        ${EMAIL_HEADER}
        ${content}
        ${EMAIL_FOOTER}
      </div>
    </body>
    </html>
  `;
}

// ==================== SPECIFIC EMAIL FUNCTIONS ====================

/**
 * KPI Reminder Email - Sent when member hasn't submitted weekly KPIs
 */
export async function sendKpiReminderEmail(
  member: { id: string; email: string; vorname: string },
  formLink: string,
  weekNumber: number
): Promise<boolean> {
  const content = `
    <div class="content">
      <p class="greeting">Hey ${member.vorname}! 👋</p>

      <p class="text">
        Wir haben bemerkt, dass deine KPIs für <strong>Kalenderwoche ${weekNumber}</strong> noch nicht eingetragen sind.
      </p>

      <p class="text">
        Deine wöchentlichen Zahlen zu tracken ist der Schlüssel zu deinem Erfolg.
        Es dauert nur 2 Minuten und hilft dir, deine Fortschritte zu sehen.
      </p>

      <div style="text-align: center;">
        <a href="${formLink}" class="button">Jetzt KPIs eintragen →</a>
      </div>

      <div class="tip">
        <div class="tip-title">💡 Tipp</div>
        <p style="margin: 0; color: #166534;">
          Trag deine Zahlen am besten jeden Freitag ein – so hast du alles noch frisch im Kopf!
        </p>
      </div>

      <p class="text" style="margin-top: 24px;">
        Falls du Fragen hast oder Hilfe brauchst, melde dich jederzeit bei deinem Coach.
      </p>
    </div>
  `;

  const html = wrapEmailTemplate(content);

  const sent = await sendEmail({
    to: member.email,
    subject: `📊 Deine KPIs für KW${weekNumber} fehlen noch`,
    html: renderTemplate(html, { appUrl: getAppUrl(), logoUrl: generateLogoUrl() }),
  });

  if (sent) {
    await prisma.communicationLog.create({
      data: {
        memberId: member.id,
        channel: "EMAIL",
        type: "REMINDER",
        subject: `Deine KPIs für KW${weekNumber} fehlen noch`,
        content: `KPI Reminder für KW${weekNumber}`,
        recipient: member.email,
        sent: true,
        sentAt: new Date(),
      },
    });
  }

  return sent;
}

/**
 * Weekly Feedback Email - Sent after KPI submission with AI feedback
 */
export async function sendWeeklyFeedbackEmail(
  member: { id: string; email: string; vorname: string },
  weekNumber: number,
  feedback: string,
  stats: {
    umsatzIst: number;
    umsatzSoll: number;
    goalAchieved: boolean;
  }
): Promise<boolean> {
  const performancePercent = stats.umsatzSoll > 0
    ? Math.round((stats.umsatzIst / stats.umsatzSoll) * 100)
    : 0;

  const performanceColor = performancePercent >= 100 ? "#16a34a" : performancePercent >= 80 ? "#ca8a04" : "#ae1d2b";

  const content = `
    <div class="content">
      <p class="greeting">
        ${stats.goalAchieved ? "🎉" : "💪"} Hey ${member.vorname}!
      </p>

      <p class="text">
        Hier ist dein persönliches Feedback für <strong>Kalenderwoche ${weekNumber}</strong>:
      </p>

      <div class="stats-box">
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="font-size: 36px; font-weight: bold; color: ${performanceColor};">
            ${performancePercent}%
          </div>
          <div style="color: #6b6b6b; font-size: 14px;">Zielerreichung</div>
        </div>
        <div class="stats-row">
          <span class="stats-label">Umsatz IST</span>
          <span class="stats-value">${stats.umsatzIst.toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 0 })}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Umsatz SOLL</span>
          <span class="stats-value">${stats.umsatzSoll.toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 0 })}</span>
        </div>
      </div>

      <div class="highlight-box">
        <p style="margin: 0; white-space: pre-wrap;">${feedback}</p>
      </div>

      <div style="text-align: center;">
        <a href="${getAppUrl()}/dashboard" class="button">Dashboard öffnen</a>
      </div>
    </div>
  `;

  const html = wrapEmailTemplate(content);

  const sent = await sendEmail({
    to: member.email,
    subject: `${stats.goalAchieved ? "🎉 Ziel erreicht!" : "📊"} Dein Feedback für KW${weekNumber}`,
    html: renderTemplate(html, { appUrl: getAppUrl(), logoUrl: generateLogoUrl() }),
  });

  if (sent) {
    await prisma.communicationLog.create({
      data: {
        memberId: member.id,
        channel: "EMAIL",
        type: "FEEDBACK",
        subject: `Dein Feedback für KW${weekNumber}`,
        content: feedback.substring(0, 500),
        recipient: member.email,
        sent: true,
        sentAt: new Date(),
      },
    });
  }

  return sent;
}

/**
 * Welcome Email - Sent after successful onboarding
 * NOTE: This does NOT include KPI setup - that comes later when KPI tracking is activated
 */
export async function sendWelcomeEmail(
  member: { id: string; email: string; vorname: string; nachname: string }
): Promise<boolean> {
  const content = `
    <div class="content">
      <p class="greeting">Willkommen im NF Mentoring, ${member.vorname}! 🚀</p>

      <p class="text">
        Wir freuen uns riesig, dich an Bord zu haben! Du hast dein Onboarding erfolgreich abgeschlossen
        – jetzt bist du offiziell Teil der NF Mentoring Familie!
      </p>

      <div class="highlight-box">
        <p style="margin: 0;">
          <strong>Was passiert jetzt?</strong><br>
          Starte mit deinen Trainings auf der LearninSuite Plattform. 
          Sobald du bereit bist, aktivieren wir dein persönliches KPI-Tracking, 
          um deine Fortschritte optimal zu begleiten.
        </p>
      </div>

      <div class="divider"></div>

      <p class="text"><strong>Was dich erwartet:</strong></p>
      <ul style="color: #4a4a4a;">
        <li>Hochwertige Trainings und Ressourcen</li>
        <li>Regelmäßige Check-ins mit deinem Coach</li>
        <li>Persönliches KPI-Tracking (wird später aktiviert)</li>
        <li>Eine Community von Gleichgesinnten</li>
      </ul>

      <p class="text" style="margin-top: 24px;">
        Bei Fragen sind wir jederzeit für dich da!
      </p>

      <p class="text">
        Auf deinen Erfolg! 💪<br>
        <strong>Dein NF Mentoring Team</strong>
      </p>
    </div>
  `;

  const html = wrapEmailTemplate(content);

  const sent = await sendEmail({
    to: member.email,
    subject: "🚀 Willkommen im NF Mentoring!",
    html: renderTemplate(html, { appUrl: getAppUrl(), logoUrl: generateLogoUrl() }),
  });

  if (sent) {
    await prisma.communicationLog.create({
      data: {
        memberId: member.id,
        channel: "EMAIL",
        type: "MANUAL",
        subject: "Willkommen im NF Mentoring!",
        content: "Welcome Email",
        recipient: member.email,
        sent: true,
        sentAt: new Date(),
      },
    });
  }

  return sent;
}

/**
 * Onboarding Invite Email - Sent when member is created
 */
export async function sendOnboardingInviteEmail(
  member: { id: string; email: string; vorname: string; nachname: string },
  onboardingUrl: string
): Promise<boolean> {
  const content = `
    <div class="content">
      <p class="greeting">Willkommen beim NF Mentoring, ${member.vorname}! 🚀</p>

      <p class="text">
        Vielen Dank für deine Anmeldung! Wir freuen uns riesig, dich auf deinem Weg zu unterstützen.
      </p>

      <div class="highlight-box">
        <p style="margin: 0;">
          <strong>Dein erster Schritt:</strong><br>
          Fülle bitte das kurze Onboarding-Formular aus, damit wir dich besser kennenlernen können.
        </p>
      </div>

      <div style="text-align: center;">
        <a href="${onboardingUrl}" class="button">Onboarding starten →</a>
      </div>

      <p class="text" style="color: #9ca3af; font-size: 14px;">
        Dauert nur 2 Minuten! Der Link ist 7 Tage gültig.
      </p>

      <div class="divider"></div>

      <p class="text">
        Bei Fragen sind wir jederzeit für dich da!
      </p>

      <p class="text">
        Auf deinen Erfolg! 💪<br>
        <strong>Dein NF Mentoring Team</strong>
      </p>
    </div>
  `;

  const html = wrapEmailTemplate(content);

  const sent = await sendEmail({
    to: member.email,
    subject: "🚀 Willkommen beim NF Mentoring!",
    html: renderTemplate(html, { appUrl: getAppUrl(), logoUrl: generateLogoUrl() }),
  });

  if (sent) {
    await prisma.communicationLog.create({
      data: {
        memberId: member.id,
        channel: "EMAIL",
        type: "MANUAL",
        subject: "Willkommen beim NF Mentoring!",
        content: "Onboarding Invite Email",
        recipient: member.email,
        sent: true,
        sentAt: new Date(),
      },
    });
  }

  return sent;
}

/**
 * Onboarding Reminder Email - Sent when member hasn't completed onboarding
 */
export async function sendOnboardingReminderEmail(
  member: { id: string; email: string; vorname: string },
  onboardingUrl: string,
  reminderNumber: number
): Promise<boolean> {
  const content = `
    <div class="content">
      <p class="greeting">Hey ${member.vorname}! 👋</p>

      <p class="text">
        Kurze Erinnerung: Du hast dein Onboarding noch nicht abgeschlossen.
      </p>

      <p class="text">
        Das dauert nur 2 Minuten und hilft uns, dich optimal zu unterstützen!
      </p>

      <div style="text-align: center;">
        <a href="${onboardingUrl}" class="button">Jetzt Onboarding abschließen →</a>
      </div>

      <p class="text">
        Auf deinen Erfolg! 💪<br>
        <strong>Dein NF Mentoring Team</strong>
      </p>
    </div>
  `;

  const html = wrapEmailTemplate(content);

  const sent = await sendEmail({
    to: member.email,
    subject: "⏰ Erinnerung: Dein NF Mentoring Onboarding wartet!",
    html: renderTemplate(html, { appUrl: getAppUrl(), logoUrl: generateLogoUrl() }),
  });

  if (sent) {
    await prisma.communicationLog.create({
      data: {
        memberId: member.id,
        channel: "EMAIL",
        type: "REMINDER",
        subject: "Erinnerung: Onboarding",
        content: `Onboarding Reminder ${reminderNumber}`,
        recipient: member.email,
        sent: true,
        sentAt: new Date(),
      },
    });
  }

  return sent;
}

/**
 * Churn Warning Email - Sent when member is at risk
 */
export async function sendChurnWarningEmail(
  member: { id: string; email: string; vorname: string },
  weeksInactive: number
): Promise<boolean> {
  const content = `
    <div class="content">
      <p class="greeting">Hey ${member.vorname},</p>

      <p class="text">
        uns ist aufgefallen, dass du schon <strong>${weeksInactive} Wochen</strong> keine KPIs mehr eingetragen hast.
      </p>

      <div class="warning">
        <div class="warning-title">⚠️ Wir machen uns Sorgen</div>
        <p style="margin: 0; color: #92400e;">
          Ist alles in Ordnung? Können wir dir irgendwie helfen?
        </p>
      </div>

      <p class="text">
        Wir wissen, dass manchmal viel los ist. Aber gerade in stressigen Zeiten ist es wichtig,
        den Überblick zu behalten. Dein Coach ist für dich da!
      </p>

      <p class="text">
        <strong>Mögliche nächste Schritte:</strong>
      </p>
      <ul style="color: #4a4a4a;">
        <li>Melde dich bei deinem Coach für ein kurzes Gespräch</li>
        <li>Trag deine KPIs ein – auch wenn die Woche nicht perfekt war</li>
        <li>Schreib uns, wenn du eine Pause brauchst</li>
      </ul>

      <div style="text-align: center;">
        <a href="mailto:support@nf-mentoring.de?subject=Ich brauche Unterstützung" class="button">Coach kontaktieren</a>
      </div>

      <p class="text" style="margin-top: 24px;">
        Wir sind hier, um dich zu unterstützen – nicht um zu urteilen.
        Lass uns gemeinsam schauen, wie wir weitermachen können.
      </p>

      <p class="text">
        Alles Gute,<br>
        <strong>Dein NF Mentoring Team</strong>
      </p>
    </div>
  `;

  const html = wrapEmailTemplate(content);

  const sent = await sendEmail({
    to: member.email,
    subject: `${member.vorname}, wir vermissen dich!`,
    html: renderTemplate(html, { appUrl: getAppUrl(), logoUrl: generateLogoUrl() }),
  });

  if (sent) {
    await prisma.communicationLog.create({
      data: {
        memberId: member.id,
        channel: "EMAIL",
        type: "ALERT",
        subject: "Wir vermissen dich",
        content: `Churn Warning nach ${weeksInactive} Wochen Inaktivität`,
        recipient: member.email,
        sent: true,
        sentAt: new Date(),
        ruleId: "L1",
      },
    });
  }

  return sent;
}

/**
 * Goal Celebration Email - Sent when member achieves their weekly goal
 */
export async function sendGoalCelebrationEmail(
  member: { id: string; email: string; vorname: string },
  weekNumber: number,
  stats: {
    umsatzIst: number;
    umsatzSoll: number;
    streak?: number;
  }
): Promise<boolean> {
  const overachievement = Math.round(((stats.umsatzIst - stats.umsatzSoll) / stats.umsatzSoll) * 100);

  const content = `
    <div class="content">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 64px;">🎉</div>
      </div>

      <p class="greeting" style="text-align: center;">
        Mega, ${member.vorname}!
      </p>

      <p class="text" style="text-align: center; font-size: 18px;">
        Du hast dein Wochenziel für <strong>KW${weekNumber}</strong> erreicht!
      </p>

      <div class="stats-box" style="text-align: center;">
        <div style="font-size: 42px; font-weight: bold; color: #16a34a;">
          ${stats.umsatzIst.toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 0 })}
        </div>
        <div style="color: #6b6b6b; margin-top: 8px;">
          ${overachievement > 0 ? `+${overachievement}% über deinem Ziel!` : "Ziel erreicht!"}
        </div>
        ${stats.streak && stats.streak > 1 ? `
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e5e5;">
            <span style="font-size: 24px;">🔥</span>
            <span style="font-weight: 600; color: #ae1d2b;"> ${stats.streak} Wochen Streak!</span>
          </div>
        ` : ""}
      </div>

      <div class="highlight-box">
        <p style="margin: 0;">
          <strong>Weiter so!</strong> Deine Konstanz zahlt sich aus. Jede Woche, in der du deine Ziele erreichst,
          bringt dich deinem großen Ziel näher.
        </p>
      </div>

      <p class="text" style="text-align: center;">
        Erzähl uns von deiner Erfolgsformel! Was hat diese Woche besonders gut geklappt?
      </p>

      <div style="text-align: center;">
        <a href="${getAppUrl()}/dashboard" class="button">Zum Dashboard</a>
      </div>
    </div>
  `;

  const html = wrapEmailTemplate(content);

  const sent = await sendEmail({
    to: member.email,
    subject: `🎉 Ziel erreicht! ${stats.umsatzIst.toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 0 })} in KW${weekNumber}`,
    html: renderTemplate(html, { appUrl: getAppUrl(), logoUrl: generateLogoUrl() }),
  });

  if (sent) {
    await prisma.communicationLog.create({
      data: {
        memberId: member.id,
        channel: "EMAIL",
        type: "CELEBRATION",
        subject: `Ziel erreicht in KW${weekNumber}`,
        content: `Umsatz: ${stats.umsatzIst}€`,
        recipient: member.email,
        sent: true,
        sentAt: new Date(),
        ruleId: "P2",
      },
    });
  }

  return sent;
}

/**
 * Coach Task Notification - Sent to coach when new task is created
 */
export async function sendCoachTaskNotification(
  coach: { email: string; vorname: string },
  task: {
    title: string;
    description?: string;
    memberName: string;
    priority: string;
  }
): Promise<boolean> {
  const priorityColors: Record<string, string> = {
    LOW: "#6b7280",
    MEDIUM: "#ca8a04",
    HIGH: "#ae1d2b",
    URGENT: "#7c2d12",
  };

  const priorityLabels: Record<string, string> = {
    LOW: "Niedrig",
    MEDIUM: "Mittel",
    HIGH: "Hoch",
    URGENT: "Dringend",
  };

  const content = `
    <div class="content">
      <p class="greeting">Hey ${coach.vorname},</p>

      <p class="text">
        Eine neue Aufgabe wurde für dich erstellt:
      </p>

      <div class="stats-box">
        <div style="margin-bottom: 12px;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; background: ${priorityColors[task.priority]}; color: white; font-size: 12px; font-weight: 600;">
            ${priorityLabels[task.priority]}
          </span>
        </div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">
          ${task.title}
        </div>
        <div style="color: #6b6b6b; font-size: 14px;">
          Mitglied: ${task.memberName}
        </div>
        ${task.description ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e5e5; color: #4a4a4a;">
            ${task.description}
          </div>
        ` : ""}
      </div>

      <div style="text-align: center;">
        <a href="${getAppUrl()}/tasks" class="button">Aufgaben ansehen</a>
      </div>
    </div>
  `;

  const html = wrapEmailTemplate(content);

  return sendEmail({
    to: coach.email,
    subject: `${task.priority === "URGENT" ? "🚨" : "📋"} Neue Aufgabe: ${task.title}`,
    html: renderTemplate(html, { appUrl: getAppUrl(), logoUrl: generateLogoUrl() }),
  });
}
