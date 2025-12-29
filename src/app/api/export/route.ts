import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/export
 * Export member data as CSV
 *
 * Body:
 * - memberIds: string[] (optional - if empty, exports all)
 * - exportType: "onboarding" | "kpi_setup" | "kpi_weeks" | "all"
 * - includeAiFeedback: boolean
 * - dateFrom?: string (ISO date)
 * - dateTo?: string (ISO date)
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      memberIds = [],
      exportType = "all",
      includeAiFeedback = true,
      dateFrom,
      dateTo,
    } = body;

    // Build member query
    const memberWhere: any = {};
    if (memberIds.length > 0) {
      memberWhere.id = { in: memberIds };
    }

    // Fetch members with their data
    const members = await prisma.member.findMany({
      where: memberWhere,
      include: {
        kpiWeeks: {
          orderBy: { weekStart: "desc" },
          where: dateFrom || dateTo ? {
            weekStart: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          } : undefined,
        },
        assignedTo: {
          select: { vorname: true, nachname: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let csvContent = "";
    let filename = "";

    switch (exportType) {
      case "onboarding":
        csvContent = generateOnboardingCsv(members);
        filename = `onboarding_export_${formatDateForFilename(new Date())}.csv`;
        break;

      case "kpi_setup":
        csvContent = generateKpiSetupCsv(members);
        filename = `kpi_setup_export_${formatDateForFilename(new Date())}.csv`;
        break;

      case "kpi_weeks":
        csvContent = generateKpiWeeksCsv(members, includeAiFeedback);
        filename = `kpi_weeks_export_${formatDateForFilename(new Date())}.csv`;
        break;

      case "all":
      default:
        csvContent = generateFullExportCsv(members, includeAiFeedback);
        filename = `full_export_${formatDateForFilename(new Date())}.csv`;
        break;
    }

    // Return CSV as response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Export failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Helper to format date for filename
function formatDateForFilename(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Helper to escape CSV values
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper to format decimal
function formatDecimal(value: any): string {
  if (value === null || value === undefined) return "";
  const num = parseFloat(String(value));
  return isNaN(num) ? "" : num.toFixed(2);
}

// Helper to format date
function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("de-DE");
}

// Generate Onboarding CSV
function generateOnboardingCsv(members: any[]): string {
  const headers = [
    "ID",
    "Vorname",
    "Nachname",
    "E-Mail",
    "Telefon",
    "WhatsApp",
    "Status",
    "Produkte",
    "Coach",
    "Unternehmen",
    "Position",
    "Aktueller Monatsumsatz",
    "Was nervt am meisten",
    "Größtes Problem",
    "Ziel-Monatsumsatz",
    "Größtes Ziel - Warum",
    "Wie aufmerksam geworden",
    "Onboarding abgeschlossen",
    "Onboarding Datum",
    "Erstellt am",
  ];

  const rows = members.map((m) => [
    m.id,
    m.vorname,
    m.nachname,
    m.email,
    m.telefon || "",
    m.whatsappNummer || "",
    m.status,
    m.produkte?.join(", ") || "",
    m.assignedTo ? `${m.assignedTo.vorname} ${m.assignedTo.nachname}` : "",
    m.unternehmen || "",
    m.position || "",
    formatDecimal(m.aktuellerMonatsumsatz),
    m.wasNervtAmMeisten || "",
    m.groessetesProblem || "",
    formatDecimal(m.zielMonatsumsatz),
    m.groessteZielWarum || "",
    m.wieAufmerksam || "",
    m.onboardingCompleted ? "Ja" : "Nein",
    formatDate(m.onboardingDate),
    formatDate(m.createdAt),
  ]);

  return [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\n");
}

// Generate KPI Setup CSV
function generateKpiSetupCsv(members: any[]): string {
  const headers = [
    "ID",
    "Vorname",
    "Nachname",
    "E-Mail",
    "Status",
    "KPI-Setup abgeschlossen",
    "KPI-Setup Datum",
    "Hauptziel (ein Satz)",
    "Tracking: Kontakte",
    "Tracking: Termine",
    "Tracking: Einheiten",
    "Tracking: Empfehlungen",
    "Tracking: Entscheider",
    "Tracking: Abschlüsse",
    "Tracking: Konvertierung",
    "Tracking: Abschlussquote",
    "Ziel: Umsatz/Woche",
    "Ziel: Umsatz/Monat",
    "Ziel: Kontakte",
    "Ziel: Entscheider",
    "Ziel: Termine vereinbart",
    "Ziel: Termine stattgefunden",
    "Ziel: Termine Abschluss",
    "Ziel: Einheiten",
    "Ziel: Empfehlungen",
    "Ziel: Konvertierung %",
    "Ziel: Abschlussquote %",
  ];

  const rows = members.map((m) => [
    m.id,
    m.vorname,
    m.nachname,
    m.email,
    m.status,
    m.kpiSetupCompleted ? "Ja" : "Nein",
    formatDate(m.kpiSetupCompletedAt),
    m.hauptzielEinSatz || "",
    m.trackKontakte ? "Ja" : "Nein",
    m.trackTermine ? "Ja" : "Nein",
    m.trackEinheiten ? "Ja" : "Nein",
    m.trackEmpfehlungen ? "Ja" : "Nein",
    m.trackEntscheider ? "Ja" : "Nein",
    m.trackAbschluesse ? "Ja" : "Nein",
    m.trackKonvertierung ? "Ja" : "Nein",
    m.trackAbschlussquote ? "Ja" : "Nein",
    formatDecimal(m.umsatzSollWoche),
    formatDecimal(m.umsatzSollMonat),
    m.kontakteSoll || "",
    m.entscheiderSoll || "",
    m.termineVereinbartSoll || "",
    m.termineStattgefundenSoll || "",
    m.termineAbschlussSoll || "",
    m.einheitenSoll || "",
    m.empfehlungenSoll || "",
    formatDecimal(m.konvertierungTerminSoll),
    formatDecimal(m.abschlussquoteSoll),
  ]);

  return [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\n");
}

// Generate KPI Weeks CSV
function generateKpiWeeksCsv(members: any[], includeAiFeedback: boolean): string {
  const baseHeaders = [
    "Member ID",
    "Vorname",
    "Nachname",
    "E-Mail",
    "KW",
    "Jahr",
    "Woche Start",
    "Umsatz IST",
    "Kontakte IST",
    "Entscheider IST",
    "Termine vereinbart IST",
    "Termine stattgefunden IST",
    "Termine Erst IST",
    "Termine Folge IST",
    "Termine Abschluss IST",
    "Termine No-Show IST",
    "Einheiten IST",
    "Empfehlungen IST",
    "No-Show Quote",
    "Konvertierung %",
    "Abschlussquote %",
    "Feeling Score",
    "Heldentat",
    "Blockiert",
    "Herausforderung",
    "Eingereicht am",
  ];

  const headers = includeAiFeedback
    ? [...baseHeaders, "KI-Feedback", "KI-Feedback Datum"]
    : baseHeaders;

  const rows: any[] = [];

  for (const member of members) {
    for (const kpi of member.kpiWeeks || []) {
      const baseRow = [
        member.id,
        member.vorname,
        member.nachname,
        member.email,
        kpi.weekNumber,
        kpi.year,
        formatDate(kpi.weekStart),
        formatDecimal(kpi.umsatzIst),
        kpi.kontakteIst ?? "",
        kpi.entscheiderIst ?? "",
        kpi.termineVereinbartIst ?? "",
        kpi.termineStattgefundenIst ?? "",
        kpi.termineErstIst ?? "",
        kpi.termineFolgeIst ?? "",
        kpi.termineAbschlussIst ?? "",
        kpi.termineNoshowIst ?? "",
        kpi.einheitenIst ?? "",
        kpi.empfehlungenIst ?? "",
        formatDecimal(kpi.noshowQuote),
        formatDecimal(kpi.konvertierungTerminIst),
        formatDecimal(kpi.abschlussquoteIst),
        kpi.feelingScore ?? "",
        kpi.heldentat || "",
        kpi.blockiert || "",
        kpi.herausforderung || "",
        formatDate(kpi.submittedAt),
      ];

      if (includeAiFeedback) {
        baseRow.push(kpi.aiFeedbackText || "");
        baseRow.push(formatDate(kpi.aiFeedbackGeneratedAt));
      }

      rows.push(baseRow);
    }
  }

  return [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\n");
}

// Generate Full Export CSV (one row per member with summary)
function generateFullExportCsv(members: any[], includeAiFeedback: boolean): string {
  const headers = [
    // Basic Info
    "ID",
    "Vorname",
    "Nachname",
    "E-Mail",
    "Telefon",
    "WhatsApp",
    "Status",
    "Produkte",
    "Coach",
    "Erstellt am",
    // Onboarding
    "Unternehmen",
    "Position",
    "Aktueller Monatsumsatz",
    "Was nervt am meisten",
    "Größtes Problem",
    "Ziel-Monatsumsatz",
    "Größtes Ziel - Warum",
    "Wie aufmerksam geworden",
    "Onboarding abgeschlossen",
    "Onboarding Datum",
    // KPI Setup
    "KPI-Setup abgeschlossen",
    "Hauptziel",
    "Ziel: Umsatz/Woche",
    "Ziel: Umsatz/Monat",
    // KPI Summary
    "Anzahl KPI-Wochen",
    "Durchschnitt Umsatz/Woche",
    "Gesamt Umsatz",
    "Durchschnitt Feeling",
    "Letzte KPI-Woche",
    // Flags
    "Churn Risk",
    "Review Flag",
    "Upsell Kandidat",
    "Danger Zone",
    // LearningSuite
    "Aktuelles Modul",
    "LS User ID",
  ];

  const rows = members.map((m) => {
    // Calculate KPI summary
    const kpiCount = m.kpiWeeks?.length || 0;
    const totalUmsatz = m.kpiWeeks?.reduce((sum: number, k: any) => sum + (parseFloat(k.umsatzIst) || 0), 0) || 0;
    const avgUmsatz = kpiCount > 0 ? totalUmsatz / kpiCount : 0;
    const avgFeeling = kpiCount > 0
      ? m.kpiWeeks.reduce((sum: number, k: any) => sum + (k.feelingScore || 0), 0) / m.kpiWeeks.filter((k: any) => k.feelingScore).length || 0
      : 0;
    const lastKpi = m.kpiWeeks?.[0];

    return [
      m.id,
      m.vorname,
      m.nachname,
      m.email,
      m.telefon || "",
      m.whatsappNummer || "",
      m.status,
      m.produkte?.join(", ") || "",
      m.assignedTo ? `${m.assignedTo.vorname} ${m.assignedTo.nachname}` : "",
      formatDate(m.createdAt),
      // Onboarding
      m.unternehmen || "",
      m.position || "",
      formatDecimal(m.aktuellerMonatsumsatz),
      m.wasNervtAmMeisten || "",
      m.groessetesProblem || "",
      formatDecimal(m.zielMonatsumsatz),
      m.groessteZielWarum || "",
      m.wieAufmerksam || "",
      m.onboardingCompleted ? "Ja" : "Nein",
      formatDate(m.onboardingDate),
      // KPI Setup
      m.kpiSetupCompleted ? "Ja" : "Nein",
      m.hauptzielEinSatz || "",
      formatDecimal(m.umsatzSollWoche),
      formatDecimal(m.umsatzSollMonat),
      // KPI Summary
      kpiCount,
      formatDecimal(avgUmsatz),
      formatDecimal(totalUmsatz),
      avgFeeling ? avgFeeling.toFixed(1) : "",
      lastKpi ? `KW${lastKpi.weekNumber}/${lastKpi.year}` : "",
      // Flags
      m.churnRisk ? "Ja" : "Nein",
      m.reviewFlag ? "Ja" : "Nein",
      m.upsellCandidate ? "Ja" : "Nein",
      m.dangerZone ? "Ja" : "Nein",
      // LearningSuite
      m.currentModule || "",
      m.learningSuiteUserId || "",
    ];
  });

  return [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\n");
}
