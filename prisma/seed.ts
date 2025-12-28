import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...\n");

  // 1. Create Admin User
  console.log("👤 Creating admin user...");
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@nf-mentoring.de" },
    update: {},
    create: {
      email: "admin@nf-mentoring.de",
      passwordHash: hashedPassword,
      vorname: "Admin",
      nachname: "NF Mentoring",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
  console.log(`   ✅ Admin created: ${admin.email}`);

  // 2. Create a Coach
  console.log("\n👨‍🏫 Creating coach...");
  const coach = await prisma.user.upsert({
    where: { email: "coach@nf-mentoring.de" },
    update: {},
    create: {
      email: "coach@nf-mentoring.de",
      passwordHash: hashedPassword,
      vorname: "Max",
      nachname: "Coach",
      role: "COACH",
      isActive: true,
    },
  });
  console.log(`   ✅ Coach created: ${coach.email}`);

  // 3. Create Test Members
  console.log("\n👥 Creating test members...");

  const member1 = await prisma.member.upsert({
    where: { email: "thomas.mueller@example.com" },
    update: {},
    create: {
      email: "thomas.mueller@example.com",
      vorname: "Thomas",
      nachname: "Müller",
      telefon: "+49 171 1234567",
      whatsappNummer: "+491711234567",
      produkte: ["NFM"],
      status: "AKTIV",
      unternehmen: "Müller Finanzberatung",
      position: "Geschäftsführer",
      aktuellerMonatsumsatz: 15000,
      zielMonatsumsatz: 30000,
      onboardingCompleted: true,
      onboardingDate: new Date("2024-01-15"),
      welcomeCallCompleted: true,
      welcomeCallDate: new Date("2024-01-17"),
      kpiTrackingActive: true,
      kpiTrackingStartDate: new Date("2024-01-20"),
      hauptzielEinSatz: "30.000€ Monatsumsatz bis Ende 2024",
      trackKontakte: true,
      trackTermine: true,
      trackEinheiten: false,
      trackEmpfehlungen: true,
      trackEntscheider: true,
      trackAbschluesse: true,
      umsatzSollWoche: 7500,
      umsatzSollMonat: 30000,
      kontakteSoll: 20,
      termineVereinbartSoll: 10,
      termineAbschlussSoll: 5,
      empfehlungenSoll: 3,
    },
  });
  console.log(`   ✅ Member created: ${member1.vorname} ${member1.nachname}`);

  const member2 = await prisma.member.upsert({
    where: { email: "sarah.schmidt@example.com" },
    update: {},
    create: {
      email: "sarah.schmidt@example.com",
      vorname: "Sarah",
      nachname: "Schmidt",
      telefon: "+49 172 9876543",
      whatsappNummer: "+491729876543",
      produkte: ["MM"],
      status: "AKTIV",
      unternehmen: "Schmidt & Partner",
      position: "Beraterin",
      aktuellerMonatsumsatz: 25000,
      zielMonatsumsatz: 50000,
      onboardingCompleted: true,
      onboardingDate: new Date("2024-02-01"),
      welcomeCallCompleted: true,
      welcomeCallDate: new Date("2024-02-03"),
      kpiTrackingActive: true,
      kpiTrackingStartDate: new Date("2024-02-05"),
      hauptzielEinSatz: "Top-Performerin im Mentoring werden",
      trackKontakte: true,
      trackTermine: true,
      trackEinheiten: true,
      trackEmpfehlungen: true,
      trackEntscheider: false,
      trackAbschluesse: true,
      umsatzSollWoche: 12500,
      umsatzSollMonat: 50000,
      kontakteSoll: 30,
      termineVereinbartSoll: 15,
      termineAbschlussSoll: 8,
      einheitenSoll: 20,
      empfehlungenSoll: 5,
      upsellCandidate: true,
    },
  });
  console.log(`   ✅ Member created: ${member2.vorname} ${member2.nachname}`);

  const member3 = await prisma.member.upsert({
    where: { email: "peter.weber@example.com" },
    update: {},
    create: {
      email: "peter.weber@example.com",
      vorname: "Peter",
      nachname: "Weber",
      telefon: "+49 173 5555555",
      produkte: ["VPMC"],
      status: "AKTIV",
      unternehmen: "Weber Versicherungen",
      position: "Inhaber",
      onboardingCompleted: true,
      onboardingDate: new Date("2024-03-01"),
      kpiTrackingActive: false, // Needs KPI setup
      churnRisk: true, // At risk
    },
  });
  console.log(`   ✅ Member created: ${member3.vorname} ${member3.nachname} (Churn Risk)`);

  // 4. Create Sample KPI Data
  console.log("\n📊 Creating sample KPI data...");

  const today = new Date();
  const getMonday = (weeksAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay() + 1 - (weeksAgo * 7));
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Last 4 weeks of KPI data for Thomas
  for (let i = 0; i < 4; i++) {
    const weekStart = getMonday(i);
    const weekNumber = Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

    await prisma.kpiWeek.upsert({
      where: {
        memberId_weekStart: {
          memberId: member1.id,
          weekStart,
        },
      },
      update: {},
      create: {
        memberId: member1.id,
        weekStart,
        weekNumber,
        year: weekStart.getFullYear(),
        umsatzIst: 5000 + Math.random() * 5000,
        kontakteIst: 15 + Math.floor(Math.random() * 10),
        entscheiderIst: 8 + Math.floor(Math.random() * 5),
        termineVereinbartIst: 8 + Math.floor(Math.random() * 5),
        termineStattgefundenIst: 6 + Math.floor(Math.random() * 4),
        termineAbschlussIst: 3 + Math.floor(Math.random() * 3),
        termineNoshowIst: Math.floor(Math.random() * 2),
        empfehlungenIst: 2 + Math.floor(Math.random() * 3),
        feelingScore: 6 + Math.floor(Math.random() * 4),
        heldentat: i === 0 ? "Großen Firmenkunden gewonnen!" : null,
        aiFeedbackGenerated: i > 0,
        aiFeedbackText: i > 0 ? "Tolle Woche! Weiter so mit den Kontakten." : null,
        submittedAt: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`   ✅ 4 weeks of KPI data created for ${member1.vorname}`);

  // Last 4 weeks of KPI data for Sarah (High Performer)
  for (let i = 0; i < 4; i++) {
    const weekStart = getMonday(i);
    const weekNumber = Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

    await prisma.kpiWeek.upsert({
      where: {
        memberId_weekStart: {
          memberId: member2.id,
          weekStart,
        },
      },
      update: {},
      create: {
        memberId: member2.id,
        weekStart,
        weekNumber,
        year: weekStart.getFullYear(),
        umsatzIst: 22000 + Math.random() * 8000, // High performer
        kontakteIst: 25 + Math.floor(Math.random() * 10),
        termineVereinbartIst: 12 + Math.floor(Math.random() * 5),
        termineStattgefundenIst: 10 + Math.floor(Math.random() * 4),
        termineAbschlussIst: 6 + Math.floor(Math.random() * 4),
        termineNoshowIst: Math.floor(Math.random() * 2),
        einheitenIst: 15 + Math.floor(Math.random() * 10),
        empfehlungenIst: 4 + Math.floor(Math.random() * 3),
        feelingScore: 8 + Math.floor(Math.random() * 3), // Happy
        heldentat: i === 0 ? "3 neue Großkunden abgeschlossen!" : "Empfehlungsquote auf 80% gesteigert",
        aiFeedbackGenerated: true,
        aiFeedbackText: "Herausragende Performance! Du bist auf dem besten Weg zum Top-Performer.",
        submittedAt: new Date(weekStart.getTime() + 5 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`   ✅ 4 weeks of KPI data created for ${member2.vorname}`);

  // 5. Create Sample Tasks
  console.log("\n✅ Creating sample tasks...");

  await prisma.task.createMany({
    data: [
      {
        memberId: member1.id,
        assignedToId: coach.id,
        title: "Monatsgespräch mit Thomas",
        description: "Ziele für nächsten Monat besprechen",
        priority: "HIGH",
        status: "OPEN",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        memberId: member3.id,
        assignedToId: coach.id,
        title: "KPI-Tracking Setup mit Peter",
        description: "Peter hat noch kein KPI-Tracking aktiviert. Anrufen und helfen.",
        priority: "URGENT",
        status: "OPEN",
        ruleId: "R2",
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
      {
        memberId: member2.id,
        assignedToId: coach.id,
        title: "Upsell-Gespräch Sarah",
        description: "Sarah zeigt Top-Performance. Premium-Upgrade besprechen.",
        priority: "MEDIUM",
        status: "OPEN",
        ruleId: "P1",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });
  console.log("   ✅ 3 sample tasks created");

  // 6. Create Upsell Pipeline Entry
  console.log("\n💰 Creating upsell pipeline entry...");
  await prisma.upsellPipeline.upsert({
    where: {
      id: "sample-upsell-1",
    },
    update: {},
    create: {
      id: "sample-upsell-1",
      memberId: member2.id,
      triggerReason: "3x 20k+ Umsatz in Folge",
      triggerRuleId: "P1",
      status: "IDENTIFIED",
      produkt: "Mastermind Plus Coaching",
      wert: 5000,
    },
  });
  console.log("   ✅ Upsell pipeline entry created");

  // 7. Create Automation Rules
  console.log("\n⚙️ Creating automation rules...");

  const automationRules = [
    {
      ruleId: "R1",
      name: "KPI Reminder",
      description: "Erinnerung an wöchentliche KPI-Eingabe wenn nicht bis Sonntag 18:00 eingegeben",
      category: "retention",
      isActive: true,
      triggerType: "SCHEDULER",
      schedule: "0 18 * * 0", // Sonntag 18:00
      conditions: { kpiNotSubmitted: true, dayOfWeek: 0 },
      actions: { sendWhatsApp: true, createTask: false },
      cooldownHours: 24,
      quietHoursStart: 21,
      quietHoursEnd: 8,
      quietHoursChannels: ["WHATSAPP"],
    },
    {
      ruleId: "R2",
      name: "Inaktivitäts-Warnung",
      description: "Bei 2+ Wochen ohne KPI-Eingabe: Task erstellen + Churn-Risk Flag",
      category: "retention",
      isActive: true,
      triggerType: "SCHEDULER",
      schedule: "0 9 * * 1", // Montag 9:00
      conditions: { weeksWithoutKpi: 2 },
      actions: { setChurnRisk: true, createTask: true, notifyCoach: true },
      cooldownHours: 168, // 7 Tage
    },
    {
      ruleId: "R3",
      name: "Danger Zone",
      description: "Bei 4+ Wochen ohne Aktivität: Danger Zone Flag + Eskalation",
      category: "retention",
      isActive: true,
      triggerType: "SCHEDULER",
      schedule: "0 9 * * 1",
      conditions: { weeksWithoutKpi: 4 },
      actions: { setDangerZone: true, createTask: true, sendEmail: true },
      cooldownHours: 168,
    },
    {
      ruleId: "P1",
      name: "High Performer Upsell",
      description: "Bei 3x 20k+ Umsatz: Upsell-Pipeline + Gratulation",
      category: "performance",
      isActive: true,
      triggerType: "NEW_KPI",
      conditions: { consecutiveHighRevenue: 3, threshold: 20000 },
      actions: { addToUpsell: true, sendCelebration: true, createTask: true },
      cooldownHours: 720, // 30 Tage
    },
    {
      ruleId: "P2",
      name: "Ziel erreicht Celebration",
      description: "Bei Erreichen des Wochenziels: Gratulations-Nachricht",
      category: "performance",
      isActive: true,
      triggerType: "NEW_KPI",
      conditions: { weeklyGoalAchieved: true },
      actions: { sendCelebration: true },
      cooldownHours: 168,
    },
    {
      ruleId: "Q1",
      name: "No-Show Alert",
      description: "Bei No-Show-Quote > 30%: Coaching-Hinweis",
      category: "quality",
      isActive: true,
      triggerType: "NEW_KPI",
      conditions: { noshowQuoteAbove: 0.3 },
      actions: { sendCoachingTip: true, createTask: true },
      cooldownHours: 168,
    },
    {
      ruleId: "L1",
      name: "Feeling Check",
      description: "Bei Feeling < 5: Coach benachrichtigen",
      category: "coaching",
      isActive: true,
      triggerType: "NEW_KPI",
      conditions: { feelingBelow: 5 },
      actions: { notifyCoach: true, createTask: true },
      cooldownHours: 168,
    },
    {
      ruleId: "L2",
      name: "Happy High Performer",
      description: "Bei Feeling ≥ 8 + Ziel erreicht: Upsell-Kandidat",
      category: "lifecycle",
      isActive: true,
      triggerType: "NEW_KPI",
      conditions: { feelingAbove: 7, weeklyGoalAchieved: true },
      actions: { setUpsellCandidate: true, addToUpsell: true },
      cooldownHours: 720,
    },
  ];

  for (const rule of automationRules) {
    await prisma.automationRule.upsert({
      where: { ruleId: rule.ruleId },
      update: rule,
      create: rule,
    });
  }
  console.log(`   ✅ ${automationRules.length} automation rules created`);

  // 8. Create Message Templates
  console.log("\n📝 Creating message templates...");

  const templates = [
    {
      slug: "kpi_reminder",
      name: "KPI Erinnerung",
      channel: "WHATSAPP" as const,
      content: "Hey {{vorname}}! 👋 Vergiss nicht, deine KPIs für diese Woche einzutragen. Hier ist dein Link: {{link}}",
      variables: ["vorname", "link"],
    },
    {
      slug: "weekly_feedback",
      name: "Wöchentliches Feedback",
      channel: "WHATSAPP" as const,
      content: "{{vorname}}, hier ist dein persönliches Feedback für KW{{weekNumber}}:\n\n{{feedback}}",
      variables: ["vorname", "weekNumber", "feedback"],
    },
    {
      slug: "goal_celebration",
      name: "Ziel erreicht",
      channel: "WHATSAPP" as const,
      content: "🎉 Mega, {{vorname}}! Du hast dein Wochenziel erreicht! {{umsatz}}€ Umsatz - weiter so! 💪",
      variables: ["vorname", "umsatz"],
    },
    {
      slug: "churn_warning_email",
      name: "Inaktivitäts-Warnung",
      channel: "EMAIL" as const,
      subject: "Wir vermissen dich, {{vorname}}!",
      content: "Hallo {{vorname}},\n\nuns ist aufgefallen, dass du schon länger keine KPIs mehr eingetragen hast.\n\nIst alles in Ordnung? Können wir dir irgendwie helfen?\n\nMelde dich gerne bei deinem Coach oder antworte auf diese E-Mail.\n\nViele Grüße\nDein NF Mentoring Team",
      variables: ["vorname"],
    },
  ];

  for (const template of templates) {
    await prisma.messageTemplate.upsert({
      where: { slug: template.slug },
      update: template,
      create: template,
    });
  }
  console.log(`   ✅ ${templates.length} message templates created`);

  // 9. Create Form Tokens for testing
  console.log("\n🔗 Creating test form tokens...");

  // Weekly KPI token for Thomas
  const weeklyToken = await prisma.formToken.create({
    data: {
      token: "test-weekly-token-thomas",
      type: "weekly",
      memberId: member1.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`   ✅ Weekly token: /form/weekly/${weeklyToken.token}`);

  // KPI Setup token for Peter
  const kpiSetupToken = await prisma.formToken.create({
    data: {
      token: "test-kpi-setup-token-peter",
      type: "kpi-setup",
      memberId: member3.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`   ✅ KPI Setup token: /form/kpi-setup/${kpiSetupToken.token}`);

  // Create a new member for onboarding test
  const newMember = await prisma.member.upsert({
    where: { email: "neu.mitglied@example.com" },
    update: {},
    create: {
      email: "neu.mitglied@example.com",
      vorname: "Neues",
      nachname: "Mitglied",
      produkte: ["NFM"],
      status: "AKTIV",
    },
  });

  const onboardingToken = await prisma.formToken.create({
    data: {
      token: "test-onboarding-token-new",
      type: "onboarding",
      memberId: newMember.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`   ✅ Onboarding token: /form/onboarding/${onboardingToken.token}`);

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Seed completed successfully!\n");
  console.log("📋 Login Credentials:");
  console.log("   Email: admin@nf-mentoring.de");
  console.log("   Password: admin123");
  console.log("\n   Email: coach@nf-mentoring.de");
  console.log("   Password: admin123");
  console.log("\n🔗 Test Form URLs:");
  console.log(`   Weekly KPI: http://localhost:3000/form/weekly/test-weekly-token-thomas`);
  console.log(`   KPI Setup: http://localhost:3000/form/kpi-setup/test-kpi-setup-token-peter`);
  console.log(`   Onboarding: http://localhost:3000/form/onboarding/test-onboarding-token-new`);
  console.log("=".repeat(60) + "\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
