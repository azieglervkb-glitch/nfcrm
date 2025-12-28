import OpenAI from "openai";
import type { Member, KpiWeek } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Lazy initialization to avoid build-time errors when OPENAI_API_KEY is not set
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

const SYSTEM_PROMPT = `Du schreibst als Nino, Mentor des NF-Mentorings.

Du verfasst persönliche, kurze WhatsApp-Nachrichten an Mentoring-Mitglieder, die wöchentlich ihre KPIs melden.

Ziel: Leistungen der Woche (IST) gegen die gesetzten Ziele (SOLL) vergleichen, zwei Optimierungspunkte aufzeigen, eine Stärke hervorheben und konkrete nächste Schritte empfehlen.

ALLGEMEINE REGELN
- Sprache: Deutsch, natürlich, ohne Fachjargon.
- Keine Erwähnung von KI oder Automatisierung.
- Absichtliche Rechtschreib- oder Grammatikfehler, allerdings randomisiert nur jede 2.-3. Nachricht und pro Nachricht nie mehr als 2 Fehler.
- Länge: 130-180 Wörter.
- Verwende den Vornamen in der Anrede.
- Verwende nur KPIs, die im Input vorhanden und sinnvoll (> 0) sind; fehlende Werte ignorieren.
- Berechne Abweichungen korrekt und runde Prozent auf ganze Zahlen (z.B. −23%).
- WICHTIG: Wenn IST = SOLL (und SOLL > 0), schreibe NICHT „(0%)“. Stattdessen: „Ziel erreicht“ / „on point".
- WICHTIG: Verwende Prozentangaben NUR, wenn SOLL > 0 UND die Abweichung ≠ 0.
- Wenn Soll = 0, keine Prozentrechnung, keine „0%“-Ausgabe. Optional: erwähne „kein Soll definiert“ nur, wenn IST > 0 und du daraus einen sinnvollen Next Step ableiten kannst.
- Nutze Heldentat, Blockaden und Herausforderungen für emotionale Tiefe (1 Satz Anerkennung oder Empathie).
- Verarbeite höchstens drei Punkte: zwei Schwächen, eine Stärke.
- Priorisiere bei vielen Abweichungen: Umsatz → Abschlussquote → Konvertierung → Termine → Entscheider → Kontakte → Empfehlungen → Einheiten.
- Bei unplausiblen Daten (Teilmengen > Gesamt): neutral erwähnen und trotzdem konstruktiv sein.

STRUKTUR DER NACHRICHT:
1. Begrüßung + Kurzbeobachtung (SOLL vs. IST)
2. 1 Satz zu Heldentat / Blockade / Herausforderung (falls vorhanden)
3. 2 konkrete Empfehlungen oder Fokuspunkte
4. 2 Next Steps (je 1 Zeile mit Zahl + Zeitbezug)
5. 1 abschließende Rückfrage zum Nachdenken

TONALITÄT NACH FEELING-SCORE:
- 1-4: ruhig, stützend, kleine Schritte.
- 5-7: motivierend, konstruktiv, klarer Fokus auf Haupthebel.
- 8-10: bestärkend, leicht fordernd, Ziel moderat anheben.

STILVARIANTEN (zufällig wählen):
- standard (60%): neutral-professionell, klar.
- locker (30%): umgangssprachlicher, kurze Sätze, Ellipsen („..."), gelegentlich Kleinschreibung.
- coachend (10%): warm, reflektierend, introspektiv.

AUSGABE:
Gib NUR den Nachrichtentext aus, keine Einleitung oder Erklärung.`;

function buildUserPrompt(
  member: Pick<Member, "vorname" | "umsatzSollWoche" | "kontakteSoll" | "entscheiderSoll" | "termineVereinbartSoll" | "termineStattgefundenSoll" | "termineAbschlussSoll" | "einheitenSoll" | "empfehlungenSoll" | "konvertierungTerminSoll" | "abschlussquoteSoll">,
  kpiWeek: Pick<KpiWeek, "feelingScore" | "heldentat" | "blockiert" | "herausforderung" | "umsatzIst" | "kontakteIst" | "entscheiderIst" | "termineVereinbartIst" | "termineStattgefundenIst" | "termineAbschlussIst" | "einheitenIst" | "empfehlungenIst" | "konvertierungTerminIst" | "abschlussquoteIst">,
  userPromptTemplate?: string
): string {
  // Use template from database if provided, otherwise use default
  const template = userPromptTemplate || `Member:
- vorname: {{vorname}}
- feeling_score: {{feeling_score}}
- heldentat: {{heldentat}}
- blockiert: {{blockiert}}
- herausforderung: {{herausforderung}}

ZIELWERTE (SOLL):
- umsatz_soll: {{umsatz_soll}}
- kontakte_soll: {{kontakte_soll}}
- entscheider_soll: {{entscheider_soll}}
- termine_vereinbart_soll: {{termine_vereinbart_soll}}
- termine_stattgefunden_soll: {{termine_stattgefunden_soll}}
- termine_abschluss_soll: {{termine_abschluss_soll}}
- einheiten_soll: {{einheiten_soll}}
- empfehlungen_soll: {{empfehlungen_soll}}
- konvertierung_termin_soll: {{konvertierung_termin_soll}} (%)
- abschlussquote_soll: {{abschlussquote_soll}} (%)

IST-WERTE (diese Woche):
- umsatz_ist: {{umsatz_ist}}
- kontakte_ist: {{kontakte_ist}}
- entscheider_ist: {{entscheider_ist}}
- termine_vereinbart_ist: {{termine_vereinbart_ist}}
- termine_stattgefunden_ist: {{termine_stattgefunden_ist}}
- termine_abschluss_ist: {{termine_abschluss_ist}}
- einheiten_ist: {{einheiten_ist}}
- empfehlungen_ist: {{empfehlungen_ist}}
- konvertierung_termin_ist: {{konvertierung_termin_ist}} (%)
- abschlussquote_ist: {{abschlussquote_ist}} (%)

AUFGABE:
1. Vergleiche alle IST- mit den SOLL-Werten.
2. Bestimme die zwei größten negativen Abweichungen und einen besonders positiven KPI.
3. Erstelle die WhatsApp-Nachricht gemäß den Regeln, inkl. zufälliger Stilvariante.`;

  // Replace template variables
  return template
    .replace(/\{\{vorname\}\}/g, member.vorname)
    .replace(/\{\{feeling_score\}\}/g, String(kpiWeek.feelingScore || "nicht angegeben"))
    .replace(/\{\{heldentat\}\}/g, kpiWeek.heldentat || "keine")
    .replace(/\{\{blockiert\}\}/g, kpiWeek.blockiert || "keine")
    .replace(/\{\{herausforderung\}\}/g, kpiWeek.herausforderung || "keine")
    .replace(/\{\{umsatz_soll\}\}/g, String(member.umsatzSollWoche || 0))
    .replace(/\{\{kontakte_soll\}\}/g, String(member.kontakteSoll || 0))
    .replace(/\{\{entscheider_soll\}\}/g, String(member.entscheiderSoll || 0))
    .replace(/\{\{termine_vereinbart_soll\}\}/g, String(member.termineVereinbartSoll || 0))
    .replace(/\{\{termine_stattgefunden_soll\}\}/g, String(member.termineStattgefundenSoll || 0))
    .replace(/\{\{termine_abschluss_soll\}\}/g, String(member.termineAbschlussSoll || 0))
    .replace(/\{\{einheiten_soll\}\}/g, String(member.einheitenSoll || 0))
    .replace(/\{\{empfehlungen_soll\}\}/g, String(member.empfehlungenSoll || 0))
    .replace(/\{\{konvertierung_termin_soll\}\}/g, String(member.konvertierungTerminSoll || 0))
    .replace(/\{\{abschlussquote_soll\}\}/g, String(member.abschlussquoteSoll || 0))
    .replace(/\{\{umsatz_ist\}\}/g, String(kpiWeek.umsatzIst || 0))
    .replace(/\{\{kontakte_ist\}\}/g, String(kpiWeek.kontakteIst || 0))
    .replace(/\{\{entscheider_ist\}\}/g, String(kpiWeek.entscheiderIst || 0))
    .replace(/\{\{termine_vereinbart_ist\}\}/g, String(kpiWeek.termineVereinbartIst || 0))
    .replace(/\{\{termine_stattgefunden_ist\}\}/g, String(kpiWeek.termineStattgefundenIst || 0))
    .replace(/\{\{termine_abschluss_ist\}\}/g, String(kpiWeek.termineAbschlussIst || 0))
    .replace(/\{\{einheiten_ist\}\}/g, String(kpiWeek.einheitenIst || 0))
    .replace(/\{\{empfehlungen_ist\}\}/g, String(kpiWeek.empfehlungenIst || 0))
    .replace(/\{\{konvertierung_termin_ist\}\}/g, String(kpiWeek.konvertierungTerminIst || 0))
    .replace(/\{\{abschlussquote_ist\}\}/g, String(kpiWeek.abschlussquoteIst || 0));
}

export type FeedbackStyle = "standard" | "locker" | "coachend";

export interface GenerateFeedbackResult {
  text: string;
  style: FeedbackStyle;
}

export async function generateKpiFeedback(
  member: Pick<Member, "vorname" | "umsatzSollWoche" | "kontakteSoll" | "entscheiderSoll" | "termineVereinbartSoll" | "termineStattgefundenSoll" | "termineAbschlussSoll" | "einheitenSoll" | "empfehlungenSoll" | "konvertierungTerminSoll" | "abschlussquoteSoll">,
  kpiWeek: Pick<KpiWeek, "feelingScore" | "heldentat" | "blockiert" | "herausforderung" | "umsatzIst" | "kontakteIst" | "entscheiderIst" | "termineVereinbartIst" | "termineStattgefundenIst" | "termineAbschlussIst" | "einheitenIst" | "empfehlungenIst" | "konvertierungTerminIst" | "abschlussquoteIst">
): Promise<GenerateFeedbackResult> {
  // Load prompts from database (or use defaults)
  let systemPromptContent = SYSTEM_PROMPT;
  let userPromptTemplate: string | undefined;

  try {
    const systemPrompt = await prisma.aiPrompt.findUnique({
      where: { promptKey: "KPI_FEEDBACK_SYSTEM", isActive: true },
    });
    if (systemPrompt) {
      systemPromptContent = systemPrompt.content;
    }

    const userPrompt = await prisma.aiPrompt.findUnique({
      where: { promptKey: "KPI_FEEDBACK_USER", isActive: true },
    });
    if (userPrompt) {
      userPromptTemplate = userPrompt.content;
    }
  } catch (error) {
    console.error("Failed to load prompts from database, using defaults:", error);
    // Fallback to hardcoded prompts
  }

  // Randomly select style
  const rand = Math.random();
  const style: FeedbackStyle =
    rand < 0.6 ? "standard" : rand < 0.9 ? "locker" : "coachend";

  const systemPrompt = `${systemPromptContent}

Gewählte Stilvariante für diese Nachricht: ${style}`;

  const userPrompt = buildUserPrompt(member, kpiWeek, userPromptTemplate);

  // Use the best available model
  // GPT-5.2 is the latest model (as of Dec 2024), fallback to latest GPT-4o if not available
  const model = process.env.OPENAI_MODEL || "gpt-5.2";
  
  const response = await getOpenAI().chat.completions.create({
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    // GPT-5.x uses max_completion_tokens (max_tokens is rejected)
    max_completion_tokens: 500,
  });

  return {
    text: response.choices[0].message.content || "",
    style,
  };
}

  // Check for data anomalies that should block AI feedback
export function hasDataAnomaly(kpiWeek: KpiWeek): { hasAnomaly: boolean; reason?: string } {
  // Negative values
  const numericFields = [
    "umsatzIst",
    "kontakteIst",
    "entscheiderIst",
    "termineVereinbartIst",
    "termineStattgefundenIst",
    "termineAbschlussIst",
    "einheitenIst",
    "empfehlungenIst",
    "konvertierungTerminIst",
    "abschlussquoteIst",
  ] as const;

  for (const field of numericFields) {
    const value = kpiWeek[field];
    if (value !== null && value !== undefined) {
      const numValue = typeof value === "object" ? Number(value) : value;
      if (numValue < 0) {
        return { hasAnomaly: true, reason: `Negative Wert in ${field}` };
      }
    }
  }

  // Unrealistic revenue (> 200,000 per week)
  if (kpiWeek.umsatzIst && Number(kpiWeek.umsatzIst) > 200000) {
    return { hasAnomaly: true, reason: "Unplausibel hoher Umsatz (> 200.000€/Woche)" };
  }

  // Subset larger than total (e.g., Abschlüsse > Termine)
  if (
    kpiWeek.termineAbschlussIst &&
    kpiWeek.termineStattgefundenIst &&
    kpiWeek.termineAbschlussIst > kpiWeek.termineStattgefundenIst
  ) {
    return {
      hasAnomaly: true,
      reason: "Abschluss-Termine > Stattgefundene Termine",
    };
  }

  if (
    kpiWeek.entscheiderIst &&
    kpiWeek.kontakteIst &&
    kpiWeek.entscheiderIst > kpiWeek.kontakteIst
  ) {
    return { hasAnomaly: true, reason: "Entscheider > Kontakte" };
  }

  return { hasAnomaly: false };
}
