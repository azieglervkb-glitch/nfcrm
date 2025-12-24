import { prisma } from "@/lib/prisma";
import { sendEmail, renderTemplate } from "@/lib/email";
import { sendWhatsApp, isInQuietHours } from "@/lib/whatsapp";
import { generateKpiFeedback, hasDataAnomaly } from "@/lib/openai";
import type { Member, KpiWeek, AutomationRule } from "@prisma/client";

// Check if cooldown is active for a rule/member combination
async function isCooldownActive(
  memberId: string,
  ruleId: string
): Promise<boolean> {
  const cooldown = await prisma.automationCooldown.findUnique({
    where: {
      memberId_ruleId: { memberId, ruleId },
    },
  });

  if (!cooldown) return false;
  return cooldown.expiresAt > new Date();
}

// Set cooldown for a rule/member combination
async function setCooldown(
  memberId: string,
  ruleId: string,
  hours: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  await prisma.automationCooldown.upsert({
    where: {
      memberId_ruleId: { memberId, ruleId },
    },
    create: { memberId, ruleId, expiresAt },
    update: { expiresAt },
  });
}

// Log automation execution
async function logAutomation(
  memberId: string | null,
  ruleId: string,
  ruleName: string,
  actionsTaken: string[],
  details?: any
): Promise<void> {
  await prisma.automationLog.create({
    data: {
      memberId,
      ruleId,
      ruleName,
      triggered: true,
      actionsTaken,
      details,
    },
  });
}

// Get recent KPIs for a member
async function getRecentKpis(
  memberId: string,
  weeks: number
): Promise<KpiWeek[]> {
  return prisma.kpiWeek.findMany({
    where: { memberId },
    orderBy: { weekStart: "desc" },
    take: weeks,
  });
}

// ==================== RULE IMPLEMENTATIONS ====================

// R1: Low-Feeling-Streak
export async function checkLowFeelingStreak(
  member: Member & { kpiWeeks: KpiWeek[] }
): Promise<void> {
  const ruleId = "R1";
  const ruleName = "Low-Feeling-Streak";

  if (await isCooldownActive(member.id, ruleId)) return;

  const recentKpis = member.kpiWeeks.slice(0, 3);
  if (recentKpis.length < 3) return;

  const allLowFeeling = recentKpis.every(
    (kpi) => kpi.feelingScore !== null && kpi.feelingScore < 5
  );

  if (allLowFeeling) {
    const actions: string[] = [];

    // Set review flag
    await prisma.member.update({
      where: { id: member.id },
      data: { reviewFlag: true },
    });
    actions.push("SET_FLAG: reviewFlag = true");

    // Create urgent task
    await prisma.task.create({
      data: {
        memberId: member.id,
        title: "Check-in 1:1 binnen 24h",
        description: `${member.vorname} ${member.nachname} hat 3 Wochen in Folge einen Feeling-Score unter 5. Dringender persönlicher Check-in erforderlich.`,
        priority: "HIGH",
        ruleId,
        assignedToId: member.assignedCoachId,
      },
    });
    actions.push("CREATE_TASK: Check-in 1:1 binnen 24h (HIGH)");

    await logAutomation(member.id, ruleId, ruleName, actions, {
      feelingScores: recentKpis.map((k) => k.feelingScore),
    });

    await setCooldown(member.id, ruleId, 168); // 7 days
  }
}

// R3: Leistungsabfall
export async function checkLeistungsabfall(
  member: Member & { kpiWeeks: KpiWeek[] }
): Promise<void> {
  const ruleId = "R3";
  const ruleName = "Leistungsabfall";

  if (await isCooldownActive(member.id, ruleId)) return;

  const recentKpis = member.kpiWeeks.slice(0, 2);
  if (recentKpis.length < 2) return;

  const twoWeeksLowPerformance = recentKpis.every((kpi) => {
    const umsatzPerf =
      member.umsatzSollWoche && kpi.umsatzIst
        ? Number(kpi.umsatzIst) / Number(member.umsatzSollWoche)
        : 1;
    const kontaktePerf =
      member.kontakteSoll && kpi.kontakteIst
        ? kpi.kontakteIst / member.kontakteSoll
        : 1;

    return umsatzPerf < 0.6 && kontaktePerf < 1;
  });

  if (twoWeeksLowPerformance) {
    const actions: string[] = [];

    // Set danger zone flag
    await prisma.member.update({
      where: { id: member.id },
      data: { dangerZone: true },
    });
    actions.push("SET_FLAG: dangerZone = true");

    // Create urgent task
    await prisma.task.create({
      data: {
        memberId: member.id,
        title: "Taktik-Call planen",
        description: `${member.vorname} ${member.nachname} zeigt Leistungsabfall über 2 Wochen. Dringender Strategie-Call erforderlich.`,
        priority: "URGENT",
        ruleId,
        assignedToId: member.assignedCoachId,
      },
    });
    actions.push("CREATE_TASK: Taktik-Call planen (URGENT)");

    await logAutomation(member.id, ruleId, ruleName, actions);
    await setCooldown(member.id, ruleId, 336); // 14 days
  }
}

// P1: Upsell-Signal
export async function checkUpsellSignal(
  member: Member,
  kpiWeek: KpiWeek
): Promise<void> {
  const ruleId = "P1";
  const ruleName = "Upsell-Signal";

  if (await isCooldownActive(member.id, ruleId)) return;

  const umsatzPerf =
    member.umsatzSollWoche && kpiWeek.umsatzIst
      ? Number(kpiWeek.umsatzIst) / Number(member.umsatzSollWoche)
      : 0;

  const terminePerf =
    member.termineAbschlussSoll && kpiWeek.termineAbschlussIst
      ? kpiWeek.termineAbschlussIst / member.termineAbschlussSoll
      : 0;

  if (umsatzPerf >= 1.3 || terminePerf >= 1.5) {
    const actions: string[] = [];

    // Set upsell flag
    await prisma.member.update({
      where: { id: member.id },
      data: { upsellCandidate: true },
    });
    actions.push("SET_FLAG: upsellCandidate = true");

    // Create upsell pipeline entry
    await prisma.upsellPipeline.create({
      data: {
        memberId: member.id,
        triggerReason: `Performance über Ziel: Umsatz ${Math.round(umsatzPerf * 100)}%, Abschlüsse ${Math.round(terminePerf * 100)}%`,
        triggerRuleId: ruleId,
        status: "IDENTIFIED",
      },
    });
    actions.push("CREATE_UPSELL_PIPELINE: Performance über Ziel");

    await logAutomation(member.id, ruleId, ruleName, actions, {
      umsatzPerf: Math.round(umsatzPerf * 100),
      terminePerf: Math.round(terminePerf * 100),
    });

    await setCooldown(member.id, ruleId, 720); // 30 days
  }
}

// P3: Momentum-Streak
export async function checkMomentumStreak(
  member: Member & { kpiWeeks: KpiWeek[] }
): Promise<void> {
  const ruleId = "P3";
  const ruleName = "Momentum-Streak";

  if (await isCooldownActive(member.id, ruleId)) return;

  const recentKpis = member.kpiWeeks.slice(0, 3);
  if (recentKpis.length < 3) return;

  const hasMomentum = recentKpis.every((kpi) => {
    let kpisAtGoal = 0;

    if (
      member.umsatzSollWoche &&
      kpi.umsatzIst &&
      Number(kpi.umsatzIst) >= Number(member.umsatzSollWoche)
    ) {
      kpisAtGoal++;
    }
    if (
      member.kontakteSoll &&
      kpi.kontakteIst &&
      kpi.kontakteIst >= member.kontakteSoll
    ) {
      kpisAtGoal++;
    }
    if (
      member.termineAbschlussSoll &&
      kpi.termineAbschlussIst &&
      kpi.termineAbschlussIst >= member.termineAbschlussSoll
    ) {
      kpisAtGoal++;
    }

    return kpisAtGoal >= 2;
  });

  const quietHours = await isInQuietHours();
  if (hasMomentum && member.whatsappNummer && !quietHours) {
    const actions: string[] = [];

    // Send celebration message
    const message = `Hey ${member.vorname}! 3 Wochen in Folge on fire - das nenne ich Momentum! Weiter so, du bist auf dem besten Weg! Was ist dein Geheimnis?`;

    const sent = await sendWhatsApp({
      phone: member.whatsappNummer,
      message,
      memberId: member.id,
      type: "CELEBRATION",
      ruleId,
    });

    if (sent) {
      actions.push("SEND_WHATSAPP: celebration_momentum");
      // Note: Communication already logged by sendWhatsApp function
    }

    // Add note
    await prisma.memberNote.create({
      data: {
        memberId: member.id,
        authorName: "System (Automation)",
        content: "Momentum-Streak erreicht! 3 Wochen in Folge >= 100% bei mind. 2 KPIs.",
        isPinned: false,
      },
    });
    actions.push("ADD_NOTE: Momentum-Streak!");

    await logAutomation(member.id, ruleId, ruleName, actions);
    await setCooldown(member.id, ruleId, 720); // 30 days
  }
}

// Q1: No-Show hoch
export async function checkHighNoShow(
  member: Member,
  kpiWeek: KpiWeek
): Promise<void> {
  const ruleId = "Q1";
  const ruleName = "No-Show hoch";

  if (await isCooldownActive(member.id, ruleId)) return;

  if (kpiWeek.noshowQuote && Number(kpiWeek.noshowQuote) >= 0.3) {
    const actions: string[] = [];

    // Create task
    await prisma.task.create({
      data: {
        memberId: member.id,
        title: "Reminder-Routine implementieren",
        description: `${member.vorname} ${member.nachname} hat eine No-Show-Quote von ${Math.round(Number(kpiWeek.noshowQuote) * 100)}%. Reminder-Strategie besprechen.`,
        priority: "MEDIUM",
        ruleId,
        assignedToId: member.assignedCoachId,
      },
    });
    actions.push("CREATE_TASK: Reminder-Routine implementieren");

    await logAutomation(member.id, ruleId, ruleName, actions, {
      noshowQuote: Math.round(Number(kpiWeek.noshowQuote) * 100),
    });

    await setCooldown(member.id, ruleId, 336); // 14 days
  }
}

// L1: Kündigungsrisiko
export async function checkChurnRisk(member: Member): Promise<void> {
  const ruleId = "L1";
  const ruleName = "Kündigungsrisiko";

  if (await isCooldownActive(member.id, ruleId)) return;

  const recentKpis = await getRecentKpis(member.id, 2);
  const twoWeeksNoKpi = recentKpis.length === 0;

  const hasLowPerformance =
    recentKpis.length > 0 &&
    recentKpis.some(
      (kpi) =>
        (kpi.feelingScore !== null && kpi.feelingScore <= 4) &&
        member.umsatzSollWoche &&
        kpi.umsatzIst &&
        Number(kpi.umsatzIst) < Number(member.umsatzSollWoche) * 0.5
    );

  if (twoWeeksNoKpi || hasLowPerformance) {
    const actions: string[] = [];

    // Set churn risk flag
    await prisma.member.update({
      where: { id: member.id },
      data: { churnRisk: true },
    });
    actions.push("SET_FLAG: churnRisk = true");

    // Create urgent task
    await prisma.task.create({
      data: {
        memberId: member.id,
        title: "Retention-Call planen",
        description: `${member.vorname} ${member.nachname} zeigt Kündigungsrisiko. ${twoWeeksNoKpi ? "2 Wochen keine KPI-Abgabe." : "Niedrige Performance und Feeling."}`,
        priority: "URGENT",
        ruleId,
        assignedToId: member.assignedCoachId,
      },
    });
    actions.push("CREATE_TASK: Retention-Call planen (URGENT)");

    await logAutomation(member.id, ruleId, ruleName, actions, {
      reason: twoWeeksNoKpi ? "2 Wochen keine KPI" : "Niedrige Performance",
    });

    await setCooldown(member.id, ruleId, 336); // 14 days
  }
}

// C1: Heldentat-Amplify
export async function checkHeldentat(
  member: Member,
  kpiWeek: KpiWeek
): Promise<void> {
  const ruleId = "C1";
  const ruleName = "Heldentat-Amplify";

  if (await isCooldownActive(member.id, ruleId)) return;

  if (kpiWeek.heldentat && kpiWeek.heldentat.trim().length > 0) {
    const actions: string[] = [];

    // Add pinned note
    await prisma.memberNote.create({
      data: {
        memberId: member.id,
        authorName: "System (Heldentat)",
        content: `Heldentat KW ${kpiWeek.weekNumber}/${kpiWeek.year}: ${kpiWeek.heldentat}`,
        isPinned: true,
      },
    });
    actions.push("ADD_NOTE: Heldentat (pinned)");

    await logAutomation(member.id, ruleId, ruleName, actions, {
      heldentat: kpiWeek.heldentat.substring(0, 100),
    });

    await setCooldown(member.id, ruleId, 168); // 7 days
  }
}

// C2: Blockade aktiv
export async function checkBlockade(
  member: Member,
  kpiWeek: KpiWeek
): Promise<void> {
  const ruleId = "C2";
  const ruleName = "Blockade aktiv";

  if (await isCooldownActive(member.id, ruleId)) return;

  if (
    kpiWeek.blockiert &&
    kpiWeek.blockiert.trim().length > 0 &&
    kpiWeek.feelingScore !== null &&
    kpiWeek.feelingScore <= 5
  ) {
    const actions: string[] = [];

    // Block AI feedback
    await prisma.kpiWeek.update({
      where: { id: kpiWeek.id },
      data: {
        aiFeedbackBlocked: true,
        aiFeedbackBlockReason: "Blockade erkannt - persönlicher Check-in erforderlich",
      },
    });
    actions.push("BLOCK_AI_FEEDBACK");

    // Create task
    await prisma.task.create({
      data: {
        memberId: member.id,
        title: "Persönlicher Check-in",
        description: `${member.vorname} ${member.nachname} hat eine Blockade gemeldet (Feeling: ${kpiWeek.feelingScore}): "${kpiWeek.blockiert}"`,
        priority: "HIGH",
        ruleId,
        assignedToId: member.assignedCoachId,
      },
    });
    actions.push("CREATE_TASK: Persönlicher Check-in (HIGH)");

    await logAutomation(member.id, ruleId, ruleName, actions, {
      blockade: kpiWeek.blockiert.substring(0, 100),
      feeling: kpiWeek.feelingScore,
    });

    await setCooldown(member.id, ruleId, 168); // 7 days
  }
}

// P2: Goal Celebration
export async function checkGoalCelebration(
  member: Member,
  kpiWeek: KpiWeek
): Promise<void> {
  const ruleId = "P2";
  const ruleName = "Ziel erreicht Celebration";

  if (await isCooldownActive(member.id, ruleId)) return;

  // Check if weekly goal is achieved
  const umsatzGoalMet =
    member.umsatzSollWoche &&
    kpiWeek.umsatzIst &&
    Number(kpiWeek.umsatzIst) >= Number(member.umsatzSollWoche);

  if (umsatzGoalMet && member.whatsappNummer) {
    const quietHours = await isInQuietHours();
    if (quietHours) return;

    const actions: string[] = [];
    const umsatz = Number(kpiWeek.umsatzIst).toLocaleString("de-DE");

    const message = `🎉 Mega, ${member.vorname}! Du hast dein Wochenziel erreicht! ${umsatz}€ Umsatz - weiter so! 💪`;

    const sent = await sendWhatsApp({
      phone: member.whatsappNummer,
      message,
      memberId: member.id,
      type: "CELEBRATION",
      ruleId,
    });

    if (sent) {
      actions.push("SEND_WHATSAPP: goal_celebration");
    }

    await logAutomation(member.id, ruleId, ruleName, actions, {
      umsatzIst: Number(kpiWeek.umsatzIst),
      umsatzSoll: Number(member.umsatzSollWoche),
    });

    await setCooldown(member.id, ruleId, 168); // 7 days
  }
}

// L2: Happy High Performer (Feeling ≥ 8 + Goal achieved = Upsell candidate)
export async function checkHappyHighPerformer(
  member: Member,
  kpiWeek: KpiWeek
): Promise<void> {
  const ruleId = "L2";
  const ruleName = "Happy High Performer";

  if (await isCooldownActive(member.id, ruleId)) return;

  const highFeeling = kpiWeek.feelingScore !== null && kpiWeek.feelingScore >= 8;
  const goalAchieved =
    member.umsatzSollWoche &&
    kpiWeek.umsatzIst &&
    Number(kpiWeek.umsatzIst) >= Number(member.umsatzSollWoche);

  if (highFeeling && goalAchieved) {
    const actions: string[] = [];

    // Set upsell candidate flag
    await prisma.member.update({
      where: { id: member.id },
      data: { upsellCandidate: true },
    });
    actions.push("SET_FLAG: upsellCandidate = true");

    // Check if already in upsell pipeline
    const existingUpsell = await prisma.upsellPipeline.findFirst({
      where: {
        memberId: member.id,
        status: { not: "VERLOREN" },
      },
    });

    if (!existingUpsell) {
      await prisma.upsellPipeline.create({
        data: {
          memberId: member.id,
          triggerReason: `Feeling ${kpiWeek.feelingScore}/10 + Ziel erreicht (${Number(kpiWeek.umsatzIst).toLocaleString("de-DE")}€)`,
          triggerRuleId: ruleId,
          status: "IDENTIFIED",
        },
      });
      actions.push("CREATE_UPSELL_PIPELINE: Happy High Performer");
    }

    // Add note
    await prisma.memberNote.create({
      data: {
        memberId: member.id,
        authorName: "System (Automation)",
        content: `Happy High Performer identifiziert: Feeling ${kpiWeek.feelingScore}/10, Umsatz ${Number(kpiWeek.umsatzIst).toLocaleString("de-DE")}€`,
        isPinned: false,
      },
    });
    actions.push("ADD_NOTE: Happy High Performer");

    await logAutomation(member.id, ruleId, ruleName, actions, {
      feeling: kpiWeek.feelingScore,
      umsatz: Number(kpiWeek.umsatzIst),
    });

    await setCooldown(member.id, ruleId, 720); // 30 days
  }
}

// Main function to run all rules after KPI submission
export async function runKpiAutomations(
  memberId: string,
  kpiWeekId: string
): Promise<void> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      kpiWeeks: {
        orderBy: { weekStart: "desc" },
        take: 4,
      },
    },
  });

  if (!member || member.status !== "AKTIV") return;

  const kpiWeek = member.kpiWeeks.find((k) => k.id === kpiWeekId);
  if (!kpiWeek) return;

  // Run all applicable rules
  await Promise.allSettled([
    checkLowFeelingStreak(member),
    checkLeistungsabfall(member),
    checkUpsellSignal(member, kpiWeek),
    checkMomentumStreak(member),
    checkHighNoShow(member, kpiWeek),
    checkHeldentat(member, kpiWeek),
    checkBlockade(member, kpiWeek),
    checkGoalCelebration(member, kpiWeek),
    checkHappyHighPerformer(member, kpiWeek),
  ]);
}

// Scheduled job function for weekly checks
export async function runScheduledAutomations(): Promise<void> {
  const activeMembers = await prisma.member.findMany({
    where: { status: "AKTIV" },
    include: {
      kpiWeeks: {
        orderBy: { weekStart: "desc" },
        take: 4,
      },
    },
  });

  for (const member of activeMembers) {
    await Promise.allSettled([checkChurnRisk(member)]);
  }
}
