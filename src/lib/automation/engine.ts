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

// Find the appropriate assignee for a task based on rule preferences
async function findTaskAssignee(ruleId: string): Promise<string | null> {
  // Find an active user who has this rule enabled
  const eligibleUser = await prisma.user.findFirst({
    where: {
      isActive: true,
      taskRuleIds: { has: ruleId },
    },
    select: { id: true },
  });

  return eligibleUser?.id || null;
}

// ==================== RULE IMPLEMENTATIONS ====================

// R1: Low-Feeling-Streak
export async function checkLowFeelingStreak(
  member: Member & { kpiWeeks: KpiWeek[] }
): Promise<void> {
  const ruleId = "R1";
  const ruleName = "Low-Feeling-Streak";

  if (await isCooldownActive(member.id, ruleId)) {
    console.log(`[R1] Cooldown active for ${member.vorname}`);
    return;
  }

  const recentKpis = member.kpiWeeks.slice(0, 3);
  console.log(`[R1] Checking ${member.vorname}: ${recentKpis.length} KPIs available (need 3)`);

  if (recentKpis.length < 3) {
    console.log(`[R1] Skipped: Not enough KPIs (${recentKpis.length}/3)`);
    return;
  }

  const allLowFeeling = recentKpis.every(
    (kpi) => kpi.feelingScore !== null && kpi.feelingScore < 5
  );
  console.log(`[R1] Feelings: ${recentKpis.map(k => k.feelingScore).join(', ')} - All low: ${allLowFeeling}`);

  if (allLowFeeling) {
    console.log(`[R1] TRIGGERED for ${member.vorname}: Creating task`);
    const actions: string[] = [];

    // Set review flag
    await prisma.member.update({
      where: { id: member.id },
      data: { reviewFlag: true },
    });
    actions.push("SET_FLAG: reviewFlag = true");

    // Create urgent task
    const assigneeR1 = await findTaskAssignee(ruleId);
    await prisma.task.create({
      data: {
        memberId: member.id,
        title: "Check-in 1:1 binnen 24h",
        description: `${member.vorname} ${member.nachname} hat 3 Wochen in Folge einen Feeling-Score unter 5. Dringender persönlicher Check-in erforderlich.`,
        priority: "HIGH",
        ruleId,
        assignedToId: assigneeR1,
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
    const assigneeR3 = await findTaskAssignee(ruleId);
    await prisma.task.create({
      data: {
        memberId: member.id,
        title: "Taktik-Call planen",
        description: `${member.vorname} ${member.nachname} zeigt Leistungsabfall über 2 Wochen. Dringender Strategie-Call erforderlich.`,
        priority: "URGENT",
        ruleId,
        assignedToId: assigneeR3,
      },
    });
    actions.push("CREATE_TASK: Taktik-Call planen (URGENT)");

    await logAutomation(member.id, ruleId, ruleName, actions);
    await setCooldown(member.id, ruleId, 336); // 14 days
  }
}

// P1: Upsell-Signal (based on consecutive months hitting revenue threshold)
export async function checkUpsellSignal(
  member: Member,
  kpiWeek: KpiWeek
): Promise<void> {
  const ruleId = "P1";
  const ruleName = "Upsell-Signal";

  if (await isCooldownActive(member.id, ruleId)) return;

  // Get upsell settings
  const settings = await prisma.systemSettings.findFirst({
    where: { id: "default" },
  });

  const consecutiveWeeks = settings?.upsellConsecutiveWeeks ?? 12;
  const monthlyThreshold = settings?.upsellRevenueThreshold
    ? Number(settings.upsellRevenueThreshold)
    : 20000;

  // Need at least 4 weeks for one "month"
  if (consecutiveWeeks < 4) return;

  // Get recent KPIs
  const recentKpis = await prisma.kpiWeek.findMany({
    where: { memberId: member.id },
    orderBy: { weekStart: "desc" },
    take: consecutiveWeeks,
  });

  // Not enough data yet
  if (recentKpis.length < consecutiveWeeks) return;

  // Check if weeks are consecutive (no gaps)
  const sortedKpis = [...recentKpis].sort(
    (a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
  );

  let isConsecutive = true;
  for (let i = 1; i < sortedKpis.length; i++) {
    const prevDate = new Date(sortedKpis[i - 1].weekStart);
    const currDate = new Date(sortedKpis[i].weekStart);
    const daysDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
    // Should be exactly 7 days apart (allow 1 day tolerance)
    if (daysDiff < 6 || daysDiff > 8) {
      isConsecutive = false;
      break;
    }
  }

  if (!isConsecutive) return;

  // Group into "months" (4 weeks each)
  const numMonths = Math.floor(consecutiveWeeks / 4);
  const monthlyRevenues: number[] = [];

  for (let i = 0; i < numMonths; i++) {
    const startIdx = i * 4;
    const monthKpis = sortedKpis.slice(startIdx, startIdx + 4);
    const monthSum = monthKpis.reduce(
      (sum, kpi) => sum + (kpi.umsatzIst ? Number(kpi.umsatzIst) : 0),
      0
    );
    monthlyRevenues.push(monthSum);
  }

  // Check if ALL months meet the threshold
  const allMonthsAboveThreshold = monthlyRevenues.every(
    (revenue) => revenue >= monthlyThreshold
  );

  if (allMonthsAboveThreshold) {
    const actions: string[] = [];
    const avgMonthlyRevenue = Math.round(
      monthlyRevenues.reduce((a, b) => a + b, 0) / monthlyRevenues.length
    );

    // Set upsell flag
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
      // Create upsell pipeline entry
      await prisma.upsellPipeline.create({
        data: {
          memberId: member.id,
          triggerReason: `${numMonths} Monate in Folge über ${monthlyThreshold.toLocaleString("de-DE")}€ Monatsumsatz (Ø ${avgMonthlyRevenue.toLocaleString("de-DE")}€)`,
          triggerRuleId: ruleId,
          status: "IDENTIFIED",
        },
      });
      actions.push("CREATE_UPSELL_PIPELINE: Monatsumsatz-Trigger");
    }

    await logAutomation(member.id, ruleId, ruleName, actions, {
      monthlyRevenues,
      avgMonthlyRevenue,
      threshold: monthlyThreshold,
      consecutiveWeeks,
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
    const assigneeQ1 = await findTaskAssignee(ruleId);
    await prisma.task.create({
      data: {
        memberId: member.id,
        title: "Reminder-Routine implementieren",
        description: `${member.vorname} ${member.nachname} hat eine No-Show-Quote von ${Math.round(Number(kpiWeek.noshowQuote) * 100)}%. Reminder-Strategie besprechen.`,
        priority: "MEDIUM",
        ruleId,
        assignedToId: assigneeQ1,
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
    const assigneeL1 = await findTaskAssignee(ruleId);
    await prisma.task.create({
      data: {
        memberId: member.id,
        title: "Retention-Call planen",
        description: `${member.vorname} ${member.nachname} zeigt Kündigungsrisiko. ${twoWeeksNoKpi ? "2 Wochen keine KPI-Abgabe." : "Niedrige Performance und Feeling."}`,
        priority: "URGENT",
        ruleId,
        assignedToId: assigneeL1,
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

  if (await isCooldownActive(member.id, ruleId)) {
    console.log(`[C2] Cooldown active for ${member.vorname}`);
    return;
  }

  const hasBlockade = kpiWeek.blockiert && kpiWeek.blockiert.trim().length > 0;
  const lowFeeling = kpiWeek.feelingScore !== null && kpiWeek.feelingScore <= 5;
  console.log(`[C2] Checking ${member.vorname}: Blockade=${hasBlockade}, Feeling=${kpiWeek.feelingScore} (<=5: ${lowFeeling})`);

  if (hasBlockade && lowFeeling) {
    console.log(`[C2] TRIGGERED for ${member.vorname}: Creating task`);
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
    const assigneeC2 = await findTaskAssignee(ruleId);
    await prisma.task.create({
      data: {
        memberId: member.id,
        title: "Persönlicher Check-in",
        description: `${member.vorname} ${member.nachname} hat eine Blockade gemeldet (Feeling: ${kpiWeek.feelingScore}): "${kpiWeek.blockiert}"`,
        priority: "HIGH",
        ruleId,
        assignedToId: assigneeC2,
      },
    });
    actions.push("CREATE_TASK: Persönlicher Check-in (HIGH)");

    await logAutomation(member.id, ruleId, ruleName, actions, {
      blockade: kpiWeek.blockiert?.substring(0, 100),
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
        take: 12, // Need more for upsell check
      },
    },
  });

  if (!member || member.status !== "AKTIV") {
    console.log(`[Automation] Skipped: Member ${memberId} not found or not active`);
    return;
  }

  const kpiWeek = member.kpiWeeks.find((k) => k.id === kpiWeekId);
  if (!kpiWeek) {
    console.log(`[Automation] Skipped: KpiWeek ${kpiWeekId} not found for member ${memberId}`);
    return;
  }

  // Log automation context for debugging
  console.log(`[Automation] Running rules for ${member.vorname} ${member.nachname} (${member.id})`);
  console.log(`[Automation] KPI count: ${member.kpiWeeks.length}, Feeling: ${kpiWeek.feelingScore}`);

  // Run all applicable rules
  await Promise.allSettled([
    // Risk & Retention
    checkLowFeelingStreak(member),
    checkLeistungsabfall(member),
    // Performance & Upside
    checkUpsellSignal(member, kpiWeek),
    checkFunnelLeak(member, kpiWeek), // P2-FUNNEL
    checkMomentumStreak(member),
    // Quality & Hygiene
    checkHighNoShow(member, kpiWeek),
    checkMissingTrackedField(member, kpiWeek), // Q3
    // Coaching-Flow
    checkHeldentat(member, kpiWeek),
    checkBlockade(member, kpiWeek),
    checkSmartNudge(member), // C3
    // Celebrations & Upsell
    checkGoalCelebration(member, kpiWeek),
    checkHappyHighPerformer(member, kpiWeek),
  ]);

  console.log(`[Automation] Completed rules for ${member.vorname} ${member.nachname}`);
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

// R2: Silent Member (Scheduled reminder for missing KPI)
export async function checkSilentMember(member: Pick<Member, 'id' | 'email' | 'vorname' | 'nachname' | 'whatsappNummer'>): Promise<void> {
  const ruleId = "R2";
  const ruleName = "Silent Member";

  if (await isCooldownActive(member.id, ruleId)) return;

  // Get current week start (Monday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  // Check if KPI exists for current week
  const kpiThisWeek = await prisma.kpiWeek.findFirst({
    where: {
      memberId: member.id,
      weekStart: { gte: weekStart },
    },
  });

  if (!kpiThisWeek) {
    const actions: string[] = [];

    // Send email reminder
    if (member.email) {
      await sendEmail({
        to: member.email,
        subject: "Erinnerung: Dein Weekly KPI-Update",
        html: `
          <h2>Hallo ${member.vorname}!</h2>
          <p>Es ist wieder Zeit für dein wöchentliches KPI-Update.</p>
          <p>Bitte trage deine Zahlen für diese Woche ein:</p>
          <p><a href="${process.env.APP_URL}/form/weekly/${member.id}" style="display: inline-block; padding: 12px 24px; background-color: #ae1d2b; color: white; text-decoration: none; border-radius: 6px;">KPIs eintragen</a></p>
          <p>Dauert nur 2 Minuten!</p>
          <p>Beste Grüße,<br>Dein NF Mentoring Team</p>
        `,
      });
      actions.push("SEND_EMAIL: kpi_reminder");
    }

    // Schedule WhatsApp for later if not in quiet hours
    const quietHours = await isInQuietHours();
    if (member.whatsappNummer && !quietHours) {
      const message = `Hey ${member.vorname}! Vergiss nicht, deine KPIs für diese Woche einzutragen. 📊`;
      await sendWhatsApp({
        phone: member.whatsappNummer,
        message,
        memberId: member.id,
        type: "REMINDER",
        ruleId,
      });
      actions.push("SEND_WHATSAPP: kpi_reminder");
    }

    await logAutomation(member.id, ruleId, ruleName, actions);
    await setCooldown(member.id, ruleId, 48); // 2 days (max 2x per week)
  }
}

// P2-Funnel: Funnel-Leak Detection
export async function checkFunnelLeak(
  member: Member,
  kpiWeek: KpiWeek
): Promise<void> {
  const ruleId = "P2-FUNNEL";
  const ruleName = "Funnel-Leak";

  if (await isCooldownActive(member.id, ruleId)) return;

  // Check conversion rates
  const kontakteOk =
    member.kontakteSoll && kpiWeek.kontakteIst
      ? kpiWeek.kontakteIst >= member.kontakteSoll * 0.9
      : false;

  const entscheiderRatio =
    kpiWeek.kontakteIst && kpiWeek.entscheiderIst
      ? kpiWeek.entscheiderIst / kpiWeek.kontakteIst
      : 1;

  const termineRatio =
    kpiWeek.termineVereinbartIst && kpiWeek.termineStattgefundenIst
      ? kpiWeek.termineStattgefundenIst / kpiWeek.termineVereinbartIst
      : 1;

  const hasFunnelLeak = kontakteOk && (entscheiderRatio < 0.3 || termineRatio < 0.7);

  if (hasFunnelLeak) {
    const actions: string[] = [];
    const issue = entscheiderRatio < 0.3 ? "Pitch optimieren" : "Terminierung verbessern";

    // Create task
    const assigneeP2 = await findTaskAssignee(ruleId);
    await prisma.task.create({
      data: {
        memberId: member.id,
        title: "Konvertierungs-Training empfehlen",
        description: `${member.vorname} ${member.nachname} zeigt Funnel-Leak: ${issue}. Entscheider-Quote: ${Math.round(entscheiderRatio * 100)}%, Termin-Quote: ${Math.round(termineRatio * 100)}%`,
        priority: "MEDIUM",
        ruleId,
        assignedToId: assigneeP2,
      },
    });
    actions.push("CREATE_TASK: Konvertierungs-Training");

    // Add note
    await prisma.memberNote.create({
      data: {
        memberId: member.id,
        authorName: "System (Automation)",
        content: `Funnel-Leak erkannt: ${issue}. Entscheider ${Math.round(entscheiderRatio * 100)}%, Termine ${Math.round(termineRatio * 100)}%`,
        isPinned: false,
      },
    });
    actions.push("ADD_NOTE: Funnel-Leak erkannt");

    await logAutomation(member.id, ruleId, ruleName, actions, {
      entscheiderRatio: Math.round(entscheiderRatio * 100),
      termineRatio: Math.round(termineRatio * 100),
    });

    await setCooldown(member.id, ruleId, 168); // 7 days
  }
}

// Q2: Daten-Anomalie
export async function checkDatenAnomalie(
  member: Member,
  kpiWeek: KpiWeek
): Promise<{ hasAnomaly: boolean; reason?: string }> {
  const ruleId = "Q2";
  const ruleName = "Daten-Anomalie";

  // Check for anomalies
  const anomalies: string[] = [];

  // Negative values
  if (kpiWeek.umsatzIst && Number(kpiWeek.umsatzIst) < 0) {
    anomalies.push("Negativer Umsatz");
  }
  if (kpiWeek.kontakteIst && kpiWeek.kontakteIst < 0) {
    anomalies.push("Negative Kontakte");
  }

  // Unrealistic values
  if (kpiWeek.umsatzIst && Number(kpiWeek.umsatzIst) > 200000) {
    anomalies.push("Umsatz > 200.000€/Woche");
  }

  // Subset > Total checks
  if (
    kpiWeek.entscheiderIst &&
    kpiWeek.kontakteIst &&
    kpiWeek.entscheiderIst > kpiWeek.kontakteIst
  ) {
    anomalies.push("Entscheider > Kontakte");
  }

  if (
    kpiWeek.termineStattgefundenIst &&
    kpiWeek.termineVereinbartIst &&
    kpiWeek.termineStattgefundenIst > kpiWeek.termineVereinbartIst
  ) {
    anomalies.push("Stattgefundene > Vereinbarte Termine");
  }

  if (anomalies.length > 0) {
    const actions: string[] = [];

    // Block AI feedback
    await prisma.kpiWeek.update({
      where: { id: kpiWeek.id },
      data: {
        aiFeedbackBlocked: true,
        aiFeedbackBlockReason: `Daten-Anomalie: ${anomalies.join(", ")}`,
      },
    });
    actions.push("BLOCK_AI_FEEDBACK");

    // Set review flag
    await prisma.member.update({
      where: { id: member.id },
      data: { reviewFlag: true },
    });
    actions.push("SET_FLAG: reviewFlag = true");

    await logAutomation(member.id, ruleId, ruleName, actions, { anomalies });

    return { hasAnomaly: true, reason: anomalies.join(", ") };
  }

  return { hasAnomaly: false };
}

// Q3: Feld fehlt aber getrackt
export async function checkMissingTrackedField(
  member: Member,
  kpiWeek: KpiWeek
): Promise<void> {
  const ruleId = "Q3";
  const ruleName = "Feld fehlt aber getrackt";

  const quietHours = await isInQuietHours();
  if (quietHours || !member.whatsappNummer) return;

  const missingFields: string[] = [];

  if (member.trackKontakte && !kpiWeek.kontakteIst) {
    missingFields.push("Kontakte");
  }
  if (member.trackTermine && !kpiWeek.termineVereinbartIst) {
    missingFields.push("Termine");
  }
  if (member.trackEinheiten && !kpiWeek.einheitenIst) {
    missingFields.push("Einheiten");
  }
  if (member.trackEmpfehlungen && !kpiWeek.empfehlungenIst) {
    missingFields.push("Empfehlungen");
  }
  if (member.trackEntscheider && !kpiWeek.entscheiderIst) {
    missingFields.push("Entscheider");
  }

  // Only notify for first missing field to avoid spam
  if (missingFields.length > 0) {
    const field = missingFields[0];
    const cooldownKey = `${ruleId}-${field}`;

    if (await isCooldownActive(member.id, cooldownKey)) return;

    const actions: string[] = [];
    const message = `Hey ${member.vorname}! Dir fehlt noch "${field}" in deinem KPI-Update diese Woche. Kannst du das noch nachtragen?`;

    await sendWhatsApp({
      phone: member.whatsappNummer,
      message,
      memberId: member.id,
      type: "REMINDER",
      ruleId,
    });
    actions.push(`SEND_WHATSAPP: missing_field_nudge (${field})`);

    await logAutomation(member.id, ruleId, ruleName, actions, { missingFields });
    await setCooldown(member.id, cooldownKey, 168); // 7 days per field
  }
}

// C3: S.M.A.R.T-Nudge (Wochenziel fehlt)
export async function checkSmartNudge(member: Member): Promise<void> {
  const ruleId = "C3";
  const ruleName = "S.M.A.R.T-Nudge";

  if (await isCooldownActive(member.id, ruleId)) return;

  const missingGoals =
    !member.umsatzSollWoche && !member.einheitenSoll && !member.kontakteSoll;

  const quietHours = await isInQuietHours();
  if (missingGoals && member.whatsappNummer && !quietHours) {
    const actions: string[] = [];

    const message = `Hey ${member.vorname}! Ich hab gesehen, dass du noch keine Wochenziele eingetragen hast. S.M.A.R.T. Ziele helfen dir, fokussiert zu bleiben! Hier kannst du sie eintragen: ${process.env.APP_URL}/form/kpi-setup/${member.id}`;

    await sendWhatsApp({
      phone: member.whatsappNummer,
      message,
      memberId: member.id,
      type: "REMINDER",
      ruleId,
    });
    actions.push("SEND_WHATSAPP: smart_nudge");

    await logAutomation(member.id, ruleId, ruleName, actions);
    await setCooldown(member.id, ruleId, 168); // 7 days
  }
}

// M1: Weekly-Reminder Process (Scheduled)
export async function runWeeklyReminders(): Promise<void> {
  const ruleId = "M1";
  const ruleName = "Weekly-Reminder Process";

  // Get current week start
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  // Find active members without KPI this week
  const membersWithoutKpi = await prisma.member.findMany({
    where: {
      status: "AKTIV",
      kpiWeeks: {
        none: {
          weekStart: { gte: weekStart },
        },
      },
    },
  });

  const hour = new Date().getHours();
  const isEvening = hour >= 18 && hour < 21;
  const isMorning = hour >= 5 && hour < 8;

  for (const member of membersWithoutKpi) {
    if (await isCooldownActive(member.id, `${ruleId}-daily`)) continue;

    const actions: string[] = [];

    // Morning: Send email
    if (isMorning && member.email) {
      await sendEmail({
        to: member.email,
        subject: "Guten Morgen! Dein Weekly KPI-Update wartet",
        html: `
          <h2>Guten Morgen, ${member.vorname}!</h2>
          <p>Wir hoffen, du hast eine gute Woche bisher!</p>
          <p>Kurze Erinnerung: Dein KPI-Update für diese Woche steht noch aus.</p>
          <p><a href="${process.env.APP_URL}/form/weekly/${member.id}" style="display: inline-block; padding: 12px 24px; background-color: #ae1d2b; color: white; text-decoration: none; border-radius: 6px;">Jetzt eintragen</a></p>
          <p>Dauert nur 2 Minuten!</p>
          <p>Beste Grüße,<br>Dein NF Mentoring Team</p>
        `,
      });
      actions.push("SEND_EMAIL: weekly_reminder_morning");
    }

    // Evening: Send WhatsApp (if still no submission)
    if (isEvening && member.whatsappNummer) {
      const quietHours = await isInQuietHours();
      if (!quietHours) {
        const message = `Hey ${member.vorname}! 👋 Bevor der Tag rum ist - hast du deine KPIs schon eingetragen? Dauert nur 2 Min: ${process.env.APP_URL}/form/weekly/${member.id}`;

        await sendWhatsApp({
          phone: member.whatsappNummer,
          message,
          memberId: member.id,
          type: "REMINDER",
          ruleId,
        });
        actions.push("SEND_WHATSAPP: weekly_reminder_evening");
      }
    }

    if (actions.length > 0) {
      await logAutomation(member.id, ruleId, ruleName, actions);
      await setCooldown(member.id, `${ruleId}-daily`, 20); // 20 hours
    }
  }
}
