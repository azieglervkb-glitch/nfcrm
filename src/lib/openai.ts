import OpenAI from "openai";
import type { Member, KpiWeek } from "@prisma/client";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
- Priorisiere bei vielen Abweichungen: Umsatz → Abschlüsse → Termine → Entscheider → Kontakte → Empfehlungen → Einheiten.
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
  member: Pick<Member, "vorname" | "umsatzSollWoche" | "kontakteSoll" | "entscheiderSoll" | "termineVereinbartSoll" | "termineStattgefundenSoll" | "termineAbschlussSoll" | "einheitenSoll" | "empfehlungenSoll">,
  kpiWeek: Pick<KpiWeek, "feelingScore" | "heldentat" | "blockiert" | "herausforderung" | "umsatzIst" | "kontakteIst" | "entscheiderIst" | "termineVereinbartIst" | "termineStattgefundenIst" | "termineAbschlussIst" | "einheitenIst" | "empfehlungenIst">
): string {
  return `Member:
- vorname: ${member.vorname}
- feeling_score: ${kpiWeek.feelingScore || "nicht angegeben"}
- heldentat: ${kpiWeek.heldentat || "keine"}
- blockiert: ${kpiWeek.blockiert || "keine"}
- herausforderung: ${kpiWeek.herausforderung || "keine"}

ZIELWERTE (SOLL):
- umsatz_soll: ${member.umsatzSollWoche || 0}
- kontakte_soll: ${member.kontakteSoll || 0}
- entscheider_soll: ${member.entscheiderSoll || 0}
- termine_vereinbart_soll: ${member.termineVereinbartSoll || 0}
- termine_stattgefunden_soll: ${member.termineStattgefundenSoll || 0}
- termine_abschluss_soll: ${member.termineAbschlussSoll || 0}
- einheiten_soll: ${member.einheitenSoll || 0}
- empfehlungen_soll: ${member.empfehlungenSoll || 0}

IST-WERTE (diese Woche):
- umsatz_ist: ${kpiWeek.umsatzIst || 0}
- kontakte_ist: ${kpiWeek.kontakteIst || 0}
- entscheider_ist: ${kpiWeek.entscheiderIst || 0}
- termine_vereinbart_ist: ${kpiWeek.termineVereinbartIst || 0}
- termine_stattgefunden_ist: ${kpiWeek.termineStattgefundenIst || 0}
- termine_abschluss_ist: ${kpiWeek.termineAbschlussIst || 0}
- einheiten_ist: ${kpiWeek.einheitenIst || 0}
- empfehlungen_ist: ${kpiWeek.empfehlungenIst || 0}

AUFGABE:
1. Vergleiche alle IST- mit den SOLL-Werten.
2. Bestimme die zwei größten negativen Abweichungen und einen besonders positiven KPI.
3. Erstelle die WhatsApp-Nachricht gemäß den Regeln, inkl. zufälliger Stilvariante.`;
}

export type FeedbackStyle = "standard" | "locker" | "coachend";

export interface GenerateFeedbackResult {
  text: string;
  style: FeedbackStyle;
}

export async function generateKpiFeedback(
  member: Pick<Member, "vorname" | "umsatzSollWoche" | "kontakteSoll" | "entscheiderSoll" | "termineVereinbartSoll" | "termineStattgefundenSoll" | "termineAbschlussSoll" | "einheitenSoll" | "empfehlungenSoll">,
  kpiWeek: Pick<KpiWeek, "feelingScore" | "heldentat" | "blockiert" | "herausforderung" | "umsatzIst" | "kontakteIst" | "entscheiderIst" | "termineVereinbartIst" | "termineStattgefundenIst" | "termineAbschlussIst" | "einheitenIst" | "empfehlungenIst">
): Promise<GenerateFeedbackResult> {
  // Randomly select style
  const rand = Math.random();
  const style: FeedbackStyle =
    rand < 0.6 ? "standard" : rand < 0.9 ? "locker" : "coachend";

  const systemPrompt = `${SYSTEM_PROMPT}

Gewählte Stilvariante für diese Nachricht: ${style}`;

  const userPrompt = buildUserPrompt(member, kpiWeek);

  // Use the best available model
  // GPT-5.2 is the latest model (as of Dec 2024), fallback to latest GPT-4o if not available
  const model = process.env.OPENAI_MODEL || "gpt-5.2";
  
  const response = await openai.chat.completions.create({
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
