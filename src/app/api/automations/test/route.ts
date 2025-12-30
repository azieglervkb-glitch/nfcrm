import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentWeekStart } from "@/lib/date-utils";
import type { Member, KpiWeek } from "@prisma/client";

// Test endpoint for automation rules
// Allows admins to test rules on specific members without side effects

interface TestResult {
  ruleId: string;
  ruleName: string;
  wouldTrigger: boolean;
  reason: string;
  details?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { memberId, ruleId } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 }
      );
    }

    // Get member with KPI data
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        kpiWeeks: {
          orderBy: { weekStart: "desc" },
          take: 12,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const latestKpi = member.kpiWeeks[0];
    const results: TestResult[] = [];

    // Test specific rule or all rules
    const rulesToTest = ruleId ? [ruleId] : [
      "R1", "R2", "R3", "P1", "P2", "P3", "Q1", "Q2", "Q3", "C1", "C2", "C3", "L1", "L2"
    ];

    for (const rule of rulesToTest) {
      const result = await testRule(rule, member, latestKpi);
      results.push(result);
    }

    return NextResponse.json({
      member: {
        id: member.id,
        name: `${member.vorname} ${member.nachname}`,
        status: member.status,
        kpiCount: member.kpiWeeks.length,
      },
      results,
    });
  } catch (error) {
    console.error("Test automation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function testRule(
  ruleId: string,
  member: Member & { kpiWeeks: KpiWeek[] },
  latestKpi: KpiWeek | undefined
): Promise<TestResult> {
  const recentKpis = member.kpiWeeks;

  switch (ruleId) {
    case "R1": {
      // Low-Feeling-Streak: 3 weeks with feeling < 5
      const last3 = recentKpis.slice(0, 3);
      if (last3.length < 3) {
        return {
          ruleId: "R1",
          ruleName: "Low-Feeling-Streak",
          wouldTrigger: false,
          reason: `Nicht genug Daten (${last3.length}/3 Wochen)`,
        };
      }
      const allLow = last3.every((k) => k.feelingScore !== null && k.feelingScore < 5);
      return {
        ruleId: "R1",
        ruleName: "Low-Feeling-Streak",
        wouldTrigger: allLow,
        reason: allLow
          ? "3 Wochen in Folge Feeling < 5"
          : "Feeling-Scores sind OK",
        details: { feelings: last3.map((k) => k.feelingScore) },
      };
    }

    case "R2": {
      // Silent Member: No KPI this week
      const weekStart = getCurrentWeekStart();

      const hasKpiThisWeek = recentKpis.some(
        (k) => new Date(k.weekStart).getTime() >= weekStart.getTime()
      );
      return {
        ruleId: "R2",
        ruleName: "Silent Member",
        wouldTrigger: !hasKpiThisWeek,
        reason: hasKpiThisWeek
          ? "KPI für diese Woche vorhanden"
          : "Kein KPI für diese Woche",
      };
    }

    case "R3": {
      // Leistungsabfall: 2 weeks low performance
      const last2 = recentKpis.slice(0, 2);
      if (last2.length < 2) {
        return {
          ruleId: "R3",
          ruleName: "Leistungsabfall",
          wouldTrigger: false,
          reason: `Nicht genug Daten (${last2.length}/2 Wochen)`,
        };
      }
      const lowPerf = last2.every((kpi) => {
        const umsatzPerf = member.umsatzSollWoche && kpi.umsatzIst
          ? Number(kpi.umsatzIst) / Number(member.umsatzSollWoche)
          : 1;
        const kontaktePerf = member.kontakteSoll && kpi.kontakteIst
          ? kpi.kontakteIst / member.kontakteSoll
          : 1;
        return umsatzPerf < 0.6 && kontaktePerf < 1;
      });
      return {
        ruleId: "R3",
        ruleName: "Leistungsabfall",
        wouldTrigger: lowPerf,
        reason: lowPerf
          ? "2 Wochen < 60% Umsatz UND Kontakte unter Soll"
          : "Performance ist OK",
        details: {
          weeks: last2.map((k) => ({
            umsatz: k.umsatzIst ? Number(k.umsatzIst) : 0,
            umsatzSoll: member.umsatzSollWoche ? Number(member.umsatzSollWoche) : 0,
            kontakte: k.kontakteIst,
            kontakteSoll: member.kontakteSoll,
          })),
        },
      };
    }

    case "P1": {
      // Upsell-Signal: Monthly revenue threshold
      const settings = await prisma.systemSettings.findFirst({
        where: { id: "default" },
      });
      const consecutiveWeeks = settings?.upsellConsecutiveWeeks ?? 12;
      const monthlyThreshold = settings?.upsellRevenueThreshold
        ? Number(settings.upsellRevenueThreshold)
        : 20000;

      if (recentKpis.length < consecutiveWeeks) {
        return {
          ruleId: "P1",
          ruleName: "Upsell-Signal",
          wouldTrigger: false,
          reason: `Nicht genug Daten (${recentKpis.length}/${consecutiveWeeks} Wochen)`,
        };
      }

      const numMonths = Math.floor(consecutiveWeeks / 4);
      const monthlyRevenues: number[] = [];
      const sortedKpis = [...recentKpis].sort(
        (a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
      );

      for (let i = 0; i < numMonths; i++) {
        const monthKpis = sortedKpis.slice(i * 4, (i + 1) * 4);
        const sum = monthKpis.reduce((s, k) => s + (k.umsatzIst ? Number(k.umsatzIst) : 0), 0);
        monthlyRevenues.push(sum);
      }

      const allAbove = monthlyRevenues.every((r) => r >= monthlyThreshold);
      return {
        ruleId: "P1",
        ruleName: "Upsell-Signal",
        wouldTrigger: allAbove,
        reason: allAbove
          ? `${numMonths} Monate über ${monthlyThreshold}€`
          : `Nicht alle Monate über ${monthlyThreshold}€`,
        details: {
          monthlyRevenues,
          threshold: monthlyThreshold,
          consecutiveWeeks,
        },
      };
    }

    case "P2": {
      // Funnel-Leak
      if (!latestKpi) {
        return {
          ruleId: "P2",
          ruleName: "Funnel-Leak",
          wouldTrigger: false,
          reason: "Kein KPI vorhanden",
        };
      }
      const kontakteOk = member.kontakteSoll && latestKpi.kontakteIst
        ? latestKpi.kontakteIst >= member.kontakteSoll * 0.9
        : false;
      const entscheiderRatio = latestKpi.kontakteIst && latestKpi.entscheiderIst
        ? latestKpi.entscheiderIst / latestKpi.kontakteIst
        : 1;
      const termineRatio = latestKpi.termineVereinbartIst && latestKpi.termineStattgefundenIst
        ? latestKpi.termineStattgefundenIst / latestKpi.termineVereinbartIst
        : 1;
      const hasLeak = kontakteOk && (entscheiderRatio < 0.3 || termineRatio < 0.7);
      return {
        ruleId: "P2",
        ruleName: "Funnel-Leak",
        wouldTrigger: hasLeak,
        reason: hasLeak
          ? `Konversionsraten zu niedrig (Entscheider: ${Math.round(entscheiderRatio * 100)}%, Termine: ${Math.round(termineRatio * 100)}%)`
          : "Konversionsraten OK",
        details: { kontakteOk, entscheiderRatio, termineRatio },
      };
    }

    case "P3": {
      // Momentum-Streak: 3 weeks >= 100% on 2+ KPIs
      const last3 = recentKpis.slice(0, 3);
      if (last3.length < 3) {
        return {
          ruleId: "P3",
          ruleName: "Momentum-Streak",
          wouldTrigger: false,
          reason: `Nicht genug Daten (${last3.length}/3 Wochen)`,
        };
      }
      const hasMomentum = last3.every((kpi) => {
        let count = 0;
        if (member.umsatzSollWoche && kpi.umsatzIst && Number(kpi.umsatzIst) >= Number(member.umsatzSollWoche)) count++;
        if (member.kontakteSoll && kpi.kontakteIst && kpi.kontakteIst >= member.kontakteSoll) count++;
        if (member.termineAbschlussSoll && kpi.termineAbschlussIst && kpi.termineAbschlussIst >= member.termineAbschlussSoll) count++;
        return count >= 2;
      });
      return {
        ruleId: "P3",
        ruleName: "Momentum-Streak",
        wouldTrigger: hasMomentum,
        reason: hasMomentum
          ? "3 Wochen >= 100% bei mind. 2 KPIs"
          : "Nicht genug Momentum",
      };
    }

    case "Q1": {
      // No-Show hoch
      if (!latestKpi || !latestKpi.noshowQuote) {
        return {
          ruleId: "Q1",
          ruleName: "No-Show hoch",
          wouldTrigger: false,
          reason: "Keine No-Show-Quote vorhanden",
        };
      }
      const highNoShow = Number(latestKpi.noshowQuote) >= 0.3;
      return {
        ruleId: "Q1",
        ruleName: "No-Show hoch",
        wouldTrigger: highNoShow,
        reason: highNoShow
          ? `No-Show-Quote ${Math.round(Number(latestKpi.noshowQuote) * 100)}% >= 30%`
          : `No-Show-Quote ${Math.round(Number(latestKpi.noshowQuote) * 100)}% < 30%`,
      };
    }

    case "Q2": {
      // Daten-Anomalie
      if (!latestKpi) {
        return {
          ruleId: "Q2",
          ruleName: "Daten-Anomalie",
          wouldTrigger: false,
          reason: "Kein KPI vorhanden",
        };
      }
      const anomalies: string[] = [];
      if (latestKpi.umsatzIst && Number(latestKpi.umsatzIst) < 0) anomalies.push("Negativer Umsatz");
      if (latestKpi.kontakteIst && latestKpi.kontakteIst < 0) anomalies.push("Negative Kontakte");
      if (latestKpi.umsatzIst && Number(latestKpi.umsatzIst) > 200000) anomalies.push("Umsatz > 200k");
      if (latestKpi.entscheiderIst && latestKpi.kontakteIst && latestKpi.entscheiderIst > latestKpi.kontakteIst) {
        anomalies.push("Entscheider > Kontakte");
      }
      return {
        ruleId: "Q2",
        ruleName: "Daten-Anomalie",
        wouldTrigger: anomalies.length > 0,
        reason: anomalies.length > 0
          ? `Anomalien: ${anomalies.join(", ")}`
          : "Keine Anomalien",
        details: { anomalies },
      };
    }

    case "Q3": {
      // Feld fehlt aber getrackt
      if (!latestKpi) {
        return {
          ruleId: "Q3",
          ruleName: "Feld fehlt aber getrackt",
          wouldTrigger: false,
          reason: "Kein KPI vorhanden",
        };
      }
      const missing: string[] = [];
      if (member.trackKontakte && !latestKpi.kontakteIst) missing.push("Kontakte");
      if (member.trackTermine && !latestKpi.termineVereinbartIst) missing.push("Termine");
      if (member.trackEinheiten && !latestKpi.einheitenIst) missing.push("Einheiten");
      if (member.trackEmpfehlungen && !latestKpi.empfehlungenIst) missing.push("Empfehlungen");
      if (member.trackEntscheider && !latestKpi.entscheiderIst) missing.push("Entscheider");
      return {
        ruleId: "Q3",
        ruleName: "Feld fehlt aber getrackt",
        wouldTrigger: missing.length > 0,
        reason: missing.length > 0
          ? `Fehlende Felder: ${missing.join(", ")}`
          : "Alle getrackten Felder ausgefüllt",
        details: { missing },
      };
    }

    case "C1": {
      // Heldentat-Amplify
      if (!latestKpi) {
        return {
          ruleId: "C1",
          ruleName: "Heldentat-Amplify",
          wouldTrigger: false,
          reason: "Kein KPI vorhanden",
        };
      }
      const hasHeldentat = !!(latestKpi.heldentat && latestKpi.heldentat.trim().length > 0);
      return {
        ruleId: "C1",
        ruleName: "Heldentat-Amplify",
        wouldTrigger: hasHeldentat,
        reason: hasHeldentat
          ? `Heldentat: "${latestKpi.heldentat?.substring(0, 50)}..."`
          : "Keine Heldentat",
      };
    }

    case "C2": {
      // Blockade aktiv
      if (!latestKpi) {
        return {
          ruleId: "C2",
          ruleName: "Blockade aktiv",
          wouldTrigger: false,
          reason: "Kein KPI vorhanden",
        };
      }
      const hasBlockade = !!(latestKpi.blockiert && latestKpi.blockiert.trim().length > 0);
      const lowFeeling = latestKpi.feelingScore !== null && latestKpi.feelingScore <= 5;
      const wouldTrigger = hasBlockade && lowFeeling;
      return {
        ruleId: "C2",
        ruleName: "Blockade aktiv",
        wouldTrigger: wouldTrigger,
        reason: wouldTrigger
          ? `Blockade + Feeling ${latestKpi.feelingScore}/10`
          : hasBlockade
          ? `Blockade aber Feeling ${latestKpi.feelingScore}/10 > 5`
          : "Keine Blockade gemeldet",
      };
    }

    case "C3": {
      // S.M.A.R.T-Nudge
      const missingGoals = !member.umsatzSollWoche && !member.einheitenSoll && !member.kontakteSoll;
      return {
        ruleId: "C3",
        ruleName: "S.M.A.R.T-Nudge",
        wouldTrigger: missingGoals,
        reason: missingGoals
          ? "Keine Wochenziele definiert"
          : "Wochenziele vorhanden",
        details: {
          umsatzSoll: member.umsatzSollWoche ? Number(member.umsatzSollWoche) : null,
          einheitenSoll: member.einheitenSoll,
          kontakteSoll: member.kontakteSoll,
        },
      };
    }

    case "L1": {
      // Kündigungsrisiko
      const hasNoKpis = recentKpis.length === 0;
      const hasLowPerf = recentKpis.some(
        (kpi) =>
          kpi.feelingScore !== null &&
          kpi.feelingScore <= 4 &&
          member.umsatzSollWoche &&
          kpi.umsatzIst &&
          Number(kpi.umsatzIst) < Number(member.umsatzSollWoche) * 0.5
      );
      return {
        ruleId: "L1",
        ruleName: "Kündigungsrisiko",
        wouldTrigger: hasNoKpis || hasLowPerf,
        reason: hasNoKpis
          ? "Keine KPIs vorhanden"
          : hasLowPerf
          ? "Niedrige Performance + niedriges Feeling"
          : "Kein Risiko erkannt",
      };
    }

    case "L2": {
      // Happy High Performer
      if (!latestKpi) {
        return {
          ruleId: "L2",
          ruleName: "Happy High Performer",
          wouldTrigger: false,
          reason: "Kein KPI vorhanden",
        };
      }
      const highFeeling = latestKpi.feelingScore !== null && latestKpi.feelingScore >= 8;
      const goalAchieved = !!(member.umsatzSollWoche && latestKpi.umsatzIst &&
        Number(latestKpi.umsatzIst) >= Number(member.umsatzSollWoche));
      return {
        ruleId: "L2",
        ruleName: "Happy High Performer",
        wouldTrigger: highFeeling && goalAchieved,
        reason: highFeeling && goalAchieved
          ? `Feeling ${latestKpi.feelingScore}/10 + Ziel erreicht`
          : !highFeeling
          ? `Feeling ${latestKpi.feelingScore}/10 < 8`
          : "Umsatzziel nicht erreicht",
      };
    }

    default:
      return {
        ruleId,
        ruleName: "Unbekannt",
        wouldTrigger: false,
        reason: "Regel nicht implementiert",
      };
  }
}
