import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Default prompts (hardcoded for now, will be moved to database)
const DEFAULT_PROMPTS = [
  {
    id: "KPI_FEEDBACK_SYSTEM",
    promptKey: "KPI_FEEDBACK_SYSTEM",
    name: "KPI Feedback - System Prompt",
    description: "Der Haupt-System-Prompt für die KPI-Feedback WhatsApp-Nachrichten. Definiert Stil, Tonalität und Struktur.",
    content: `Du schreibst als Nino, Mentor des NF-Mentorings.

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
- Wenn Soll = 0, keine Prozentrechnung, ggf. absolute Abweichung nennen (z.B. „−3 Termine").
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
Gib NUR den Nachrichtentext aus, keine Einleitung oder Erklärung.`,
    isActive: true,
    isDefault: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "KPI_FEEDBACK_USER",
    promptKey: "KPI_FEEDBACK_USER",
    name: "KPI Feedback - User Prompt Template",
    description: "Das Template für den User-Prompt mit den KPI-Daten des Members. Variablen: {{vorname}}, {{feeling_score}}, etc.",
    content: `Member:
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

IST-WERTE (diese Woche):
- umsatz_ist: {{umsatz_ist}}
- kontakte_ist: {{kontakte_ist}}
- entscheider_ist: {{entscheider_ist}}
- termine_vereinbart_ist: {{termine_vereinbart_ist}}
- termine_stattgefunden_ist: {{termine_stattgefunden_ist}}
- termine_abschluss_ist: {{termine_abschluss_ist}}
- einheiten_ist: {{einheiten_ist}}
- empfehlungen_ist: {{empfehlungen_ist}}

AUFGABE:
1. Vergleiche alle IST- mit den SOLL-Werten.
2. Bestimme die zwei größten negativen Abweichungen und einen besonders positiven KPI.
3. Erstelle die WhatsApp-Nachricht gemäß den Regeln, inkl. zufälliger Stilvariante.`,
    isActive: true,
    isDefault: true,
    createdAt: null,
    updatedAt: null,
  },
];

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access prompts
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Return default prompts (database storage coming soon)
    return NextResponse.json(DEFAULT_PROMPTS);
  } catch (error) {
    console.error("Failed to fetch prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update prompts
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Database storage coming soon - for now, prompts are read-only
    return NextResponse.json({
      success: false,
      message: "Prompt-Speicherung in der Datenbank kommt bald. Die Prompts werden derzeit aus dem Code geladen.",
    });
  } catch (error) {
    console.error("Failed to update prompt:", error);
    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 }
    );
  }
}
