import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Default templates
const DEFAULT_TEMPLATES = [
  {
    slug: "kpi_reminder",
    name: "KPI Erinnerung",
    channel: "EMAIL" as const,
    subject: "📊 Deine KPIs für KW{{weekNumber}} fehlen noch",
    content: `<div class="content">
  <p class="greeting">Hey {{vorname}}! 👋</p>

  <p class="text">
    Wir haben bemerkt, dass deine KPIs für <strong>Kalenderwoche {{weekNumber}}</strong> noch nicht eingetragen sind.
  </p>

  <p class="text">
    Deine wöchentlichen Zahlen zu tracken ist der Schlüssel zu deinem Erfolg.
    Es dauert nur 2 Minuten und hilft dir, deine Fortschritte zu sehen.
  </p>

  <div style="text-align: center;">
    <a href="{{formLink}}" class="button">Jetzt KPIs eintragen →</a>
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
</div>`,
    variables: ["vorname", "weekNumber", "formLink"],
  },
  {
    slug: "weekly_feedback",
    name: "Wöchentliches Feedback",
    channel: "EMAIL" as const,
    subject: "{{goalEmoji}} Dein Feedback für KW{{weekNumber}}",
    content: `<div class="content">
  <p class="greeting">
    {{goalEmoji}} Hey {{vorname}}!
  </p>

  <p class="text">
    Hier ist dein persönliches Feedback für <strong>Kalenderwoche {{weekNumber}}</strong>:
  </p>

  <div class="stats-box">
    <div style="text-align: center; margin-bottom: 16px;">
      <div style="font-size: 36px; font-weight: bold; color: {{performanceColor}};">
        {{performancePercent}}%
      </div>
      <div style="color: #6b6b6b; font-size: 14px;">Zielerreichung</div>
    </div>
    <div class="stats-row">
      <span class="stats-label">Umsatz IST</span>
      <span class="stats-value">{{umsatzIst}}</span>
    </div>
    <div class="stats-row">
      <span class="stats-label">Umsatz SOLL</span>
      <span class="stats-value">{{umsatzSoll}}</span>
    </div>
  </div>

  <div class="highlight-box">
    <p style="margin: 0; white-space: pre-wrap;">{{feedback}}</p>
  </div>

  <div style="text-align: center;">
    <a href="{{dashboardLink}}" class="button">Dashboard öffnen</a>
  </div>
</div>`,
    variables: ["vorname", "weekNumber", "goalEmoji", "performanceColor", "performancePercent", "umsatzIst", "umsatzSoll", "feedback", "dashboardLink"],
  },
  {
    slug: "onboarding_invite",
    name: "Onboarding Einladung",
    channel: "EMAIL" as const,
    subject: "🚀 Willkommen beim NF Mentoring!",
    content: `<div class="content">
  <p class="greeting">Willkommen beim NF Mentoring, {{vorname}}! 🚀</p>

  <p class="text">
    Wir freuen uns riesig, dich an Bord zu haben!
  </p>

  <div class="highlight-box">
    <p style="margin: 0;">
      <strong>Dein erster Schritt:</strong><br>
      Fülle bitte das kurze Onboarding-Formular aus, damit wir dich besser kennenlernen können.
    </p>
  </div>

  <div style="text-align: center;">
    <a href="{{onboardingLink}}" class="button">Onboarding starten →</a>
  </div>

  <div class="divider"></div>

  <p class="text">
    Dauert nur 2 Minuten! Der Link ist 7 Tage gültig.
  </p>

  <p class="text" style="margin-top: 24px;">
    Auf deinen Erfolg! 💪<br>
    <strong>Dein NF Mentoring Team</strong>
  </p>
</div>`,
    variables: ["vorname", "onboardingLink"],
  },
  {
    slug: "onboarding_reminder",
    name: "Onboarding Erinnerung",
    channel: "EMAIL" as const,
    subject: "⏰ Erinnerung: Dein NF Mentoring Onboarding wartet!",
    content: `<div class="content">
  <p class="greeting">Hey {{vorname}}! 👋</p>

  <p class="text">
    Kurze Erinnerung: Du hast dein Onboarding noch nicht abgeschlossen.
  </p>

  <p class="text">
    Das dauert nur 2 Minuten und hilft uns, dich optimal zu unterstützen!
  </p>

  <div style="text-align: center;">
    <a href="{{onboardingLink}}" class="button">Jetzt Onboarding abschließen →</a>
  </div>

  <div class="divider"></div>

  <p class="text">
    Auf deinen Erfolg! 💪<br>
    <strong>Dein NF Mentoring Team</strong>
  </p>
</div>`,
    variables: ["vorname", "onboardingLink"],
  },
  {
    slug: "welcome_email",
    name: "Willkommens-Email (nach Onboarding)",
    channel: "EMAIL" as const,
    subject: "🎉 Onboarding abgeschlossen!",
    content: `<div class="content">
  <p class="greeting">Perfekt, {{vorname}}! 🎉</p>

  <p class="text">
    Dein Onboarding ist abgeschlossen. Wir freuen uns, dich als Teil unserer Community begrüßen zu dürfen!
  </p>

  <div class="highlight-box">
    <p style="margin: 0;">
      <strong>Was jetzt?</strong><br>
      Dein Coach wird sich in Kürze bei dir melden, um deinen persönlichen Erfolgsplan zu besprechen.
    </p>
  </div>

  <div class="divider"></div>

  <p class="text"><strong>Was dich erwartet:</strong></p>
  <ul style="color: #4a4a4a;">
    <li>Persönliches KPI-Tracking mit wöchentlichem Feedback</li>
    <li>Regelmäßige Check-ins mit deinem Coach</li>
    <li>Zugang zu exklusiven Ressourcen und Trainings</li>
    <li>Eine Community von Gleichgesinnten</li>
  </ul>

  <p class="text" style="margin-top: 24px;">
    Bei Fragen sind wir jederzeit für dich da!
  </p>

  <p class="text">
    Auf deinen Erfolg! 💪<br>
    <strong>Dein NF Mentoring Team</strong>
  </p>
</div>`,
    variables: ["vorname", "nachname"],
  },
  {
    slug: "kpi_setup_invite",
    name: "KPI-Setup Einladung",
    channel: "EMAIL" as const,
    subject: "📊 Zeit für dein KPI-Tracking!",
    content: `<div class="content">
  <p class="greeting">Hey {{vorname}}! 🚀</p>

  <p class="text">
    Super, dass du dein Onboarding abgeschlossen hast! Jetzt wird's spannend.
  </p>

  <div class="highlight-box">
    <p style="margin: 0;">
      <strong>Dein nächster Schritt:</strong><br>
      Richte dein persönliches KPI-Tracking ein, damit wir deine Fortschritte optimal begleiten können.
    </p>
  </div>

  <div style="text-align: center;">
    <a href="{{kpiSetupLink}}" class="button">KPI-Tracking einrichten →</a>
  </div>

  <div class="divider"></div>

  <p class="text">
    Dauert nur 5 Minuten und ist die Basis für dein wöchentliches Feedback!
  </p>

  <p class="text" style="margin-top: 24px;">
    Auf deinen Erfolg! 💪<br>
    <strong>Dein NF Mentoring Team</strong>
  </p>
</div>`,
    variables: ["vorname", "kpiSetupLink"],
  },
  {
    slug: "kpi_setup_reminder",
    name: "KPI-Setup Erinnerung",
    channel: "EMAIL" as const,
    subject: "⏰ Erinnerung: Richte dein KPI-Tracking ein!",
    content: `<div class="content">
  <p class="greeting">Hey {{vorname}}! 👋</p>

  <p class="text">
    Kurze Erinnerung: Du hast dein KPI-Tracking noch nicht eingerichtet.
  </p>

  <p class="text">
    Das dauert nur 5 Minuten und ist wichtig, damit du dein wöchentliches Feedback erhältst!
  </p>

  <div style="text-align: center;">
    <a href="{{kpiSetupLink}}" class="button">Jetzt KPI-Tracking einrichten →</a>
  </div>

  <div class="divider"></div>

  <p class="text">
    Auf deinen Erfolg! 💪<br>
    <strong>Dein NF Mentoring Team</strong>
  </p>
</div>`,
    variables: ["vorname", "kpiSetupLink"],
  },
  {
    slug: "churn_warning",
    name: "Churn-Warnung",
    channel: "EMAIL" as const,
    subject: "{{vorname}}, wir vermissen dich!",
    content: `<div class="content">
  <p class="greeting">Hey {{vorname}},</p>

  <p class="text">
    uns ist aufgefallen, dass du schon <strong>{{weeksInactive}} Wochen</strong> keine KPIs mehr eingetragen hast.
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
</div>`,
    variables: ["vorname", "weeksInactive"],
  },
  {
    slug: "goal_celebration",
    name: "Ziel erreicht!",
    channel: "EMAIL" as const,
    subject: "🎉 Ziel erreicht! {{umsatzIst}} in KW{{weekNumber}}",
    content: `<div class="content">
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="font-size: 64px;">🎉</div>
  </div>

  <p class="greeting" style="text-align: center;">
    Mega, {{vorname}}!
  </p>

  <p class="text" style="text-align: center; font-size: 18px;">
    Du hast dein Wochenziel für <strong>KW{{weekNumber}}</strong> erreicht!
  </p>

  <div class="stats-box" style="text-align: center;">
    <div style="font-size: 42px; font-weight: bold; color: #16a34a;">
      {{umsatzIst}}
    </div>
    <div style="color: #6b6b6b; margin-top: 8px;">
      {{overachievementText}}
    </div>
    {{streakHtml}}
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
    <a href="{{dashboardLink}}" class="button">Zum Dashboard</a>
  </div>
</div>`,
    variables: ["vorname", "weekNumber", "umsatzIst", "overachievementText", "streakHtml", "dashboardLink"],
  },
  {
    slug: "coach_task",
    name: "Coach Aufgaben-Benachrichtigung",
    channel: "EMAIL" as const,
    subject: "{{priorityEmoji}} Neue Aufgabe: {{taskTitle}}",
    content: `<div class="content">
  <p class="greeting">Hey {{coachVorname}},</p>

  <p class="text">
    Eine neue Aufgabe wurde für dich erstellt:
  </p>

  <div class="stats-box">
    <div style="margin-bottom: 12px;">
      <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; background: {{priorityColor}}; color: white; font-size: 12px; font-weight: 600;">
        {{priorityLabel}}
      </span>
    </div>
    <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">
      {{taskTitle}}
    </div>
    <div style="color: #6b6b6b; font-size: 14px;">
      Mitglied: {{memberName}}
    </div>
    {{taskDescriptionHtml}}
  </div>

  <div style="text-align: center;">
    <a href="{{tasksLink}}" class="button">Aufgaben ansehen</a>
  </div>
</div>`,
    variables: ["coachVorname", "taskTitle", "memberName", "priorityEmoji", "priorityColor", "priorityLabel", "taskDescriptionHtml", "tasksLink"],
  },
  {
    slug: "whatsapp_onboarding_invite",
    name: "WhatsApp Onboarding Einladung",
    channel: "WHATSAPP" as const,
    subject: null,
    content: `Hey {{vorname}}! 👋

Willkommen beim NF Mentoring! 🚀

Bitte fülle kurz dein Onboarding aus, damit wir dich besser kennenlernen können:

{{onboardingLink}}

Dauert nur 2 Minuten! 💪`,
    variables: ["vorname", "onboardingLink"],
  },
  {
    slug: "whatsapp_onboarding_reminder",
    name: "WhatsApp Onboarding Erinnerung",
    channel: "WHATSAPP" as const,
    subject: null,
    content: `Hey {{vorname}}! 👋

Kurze Erinnerung: Du hast dein Onboarding noch nicht abgeschlossen. Dauert nur 2 Min:

{{onboardingLink}}`,
    variables: ["vorname", "onboardingLink"],
  },
  {
    slug: "whatsapp_kpi_setup_invite",
    name: "WhatsApp KPI-Setup Einladung",
    channel: "WHATSAPP" as const,
    subject: null,
    content: `Hey {{vorname}}! 🚀

Super, dass du dein Onboarding abgeschlossen hast!

Jetzt fehlt nur noch dein KPI-Tracking Setup (dauert 5 Min):

{{kpiSetupLink}}

Let's go! 💪`,
    variables: ["vorname", "kpiSetupLink"],
  },
  {
    slug: "whatsapp_kpi_setup_reminder",
    name: "WhatsApp KPI-Setup Erinnerung",
    channel: "WHATSAPP" as const,
    subject: null,
    content: `Hey {{vorname}}! 👋

Kurze Erinnerung: Richte dein KPI-Tracking ein, um dein wöchentliches Feedback zu erhalten:

{{kpiSetupLink}}`,
    variables: ["vorname", "kpiSetupLink"],
  },
  {
    slug: "whatsapp_kpi_reminder",
    name: "WhatsApp KPI Erinnerung",
    channel: "WHATSAPP" as const,
    subject: null,
    content: `Hey {{vorname}}! 👋

Deine KPIs für KW{{weekNumber}} fehlen noch. Nimm dir 2 Minuten und trag deine Zahlen ein:

{{formLink}}

Keep pushing! 💪`,
    variables: ["vorname", "weekNumber", "formLink"],
  },
  {
    slug: "whatsapp_goal_celebration",
    name: "WhatsApp Ziel erreicht",
    channel: "WHATSAPP" as const,
    subject: null,
    content: `🎉 MEGA, {{vorname}}!

Du hast dein Wochenziel erreicht: {{umsatzIst}}

{{streakText}}

Weiter so! 🚀`,
    variables: ["vorname", "umsatzIst", "streakText"],
  },
];

// POST /api/templates/initialize - Create default templates
export async function POST() {
  try {
    const results = {
      created: 0,
      skipped: 0,
      templates: [] as string[],
    };

    for (const template of DEFAULT_TEMPLATES) {
      // Check if template already exists
      const existing = await prisma.messageTemplate.findUnique({
        where: { slug: template.slug },
      });

      if (existing) {
        results.skipped++;
        continue;
      }

      await prisma.messageTemplate.create({
        data: template,
      });

      results.created++;
      results.templates.push(template.slug);
    }

    return NextResponse.json({
      success: true,
      message: `${results.created} templates created, ${results.skipped} already existed`,
      ...results,
    });
  } catch (error) {
    console.error("Failed to initialize templates:", error);
    return NextResponse.json(
      { error: "Failed to initialize templates" },
      { status: 500 }
    );
  }
}
