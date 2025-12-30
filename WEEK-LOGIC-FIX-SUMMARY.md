# Week Selection Logik - Fix Summary

## Problem gefunden

**Szenario:** Heute ist 30.12.2024 (Montag, KW1), Peter hat KW52 bereits getrackt

**Falsches Verhalten:**
- Im Dropdown stand: "KW1 (29.12. - 04.01.2026) (Vorwoche)"
- Aber KW1 ist die AKTUELLE Woche, nicht die Vorwoche!
- Vorwoche war KW52, die hat er schon getrackt

## Root Cause

`isDefault` wurde fälschlicherweise verwendet, um "(Vorwoche)" anzuzeigen:
- `isDefault` bedeutet: "sollte als Standard ausgewählt werden"
- Wenn KW52 eingereicht, aber KW1 nicht:
  - KW52: `isDefault = false` (weil bereits eingereicht)
  - KW1: `isDefault = true` (weil sollte Standard sein)
- Frontend zeigte dann KW1 mit "(Vorwoche)", weil `isDefault = true`

## Lösung

Neues Flag `isPreviousWeek` hinzugefügt:
- `isPreviousWeek: true` für previousWeek (KW52)
- `isPreviousWeek: false` für currentWeek (KW1)
- Frontend zeigt "(Vorwoche)" nur wenn `isPreviousWeek === true`

## Geänderte Dateien

### APIs (3 Dateien):
- `/api/member/kpi/route.ts` - `isPreviousWeek` Flag hinzugefügt
- `/api/member/kpi/full/route.ts` - `isPreviousWeek` Flag hinzugefügt
- `/api/forms/weekly/[token]/route.ts` - `isPreviousWeek` Flag hinzugefügt

### Frontend (2 Dateien):
- `/member/[memberId]/kpi/page.tsx` - Verwendet jetzt `isPreviousWeek` statt `isDefault`
- `/(member)/member/kpi/page.tsx` - Verwendet jetzt `isPreviousWeek` statt `isDefault`

## Test-Szenarien

### Szenario A: Heute ist 30.12 (KW1), KW52 eingereicht
- Erwartet: Nur KW1 angezeigt, OHNE "(Vorwoche)" Label
- Ergebnis: ✅ KW1 wird angezeigt, `isPreviousWeek = false` → kein "(Vorwoche)" Label

### Szenario B: Heute ist 30.12 (KW1), keine eingereicht
- Erwartet: Beide angezeigt, KW52 mit "(Vorwoche)", KW1 ohne Label
- Ergebnis: ✅ KW52: `isPreviousWeek = true` → "(Vorwoche)", KW1: `isPreviousWeek = false` → kein Label

### Szenario C: Heute ist 30.12 (KW1), beide eingereicht
- Erwartet: Beide angezeigt (zum Bearbeiten), KW52 mit "(Vorwoche)", KW1 ohne Label
- Ergebnis: ✅ KW52: `isPreviousWeek = true` → "(Vorwoche)", KW1: `isPreviousWeek = false` → kein Label

## Status

✅ Alle Änderungen committed und gepusht zu: `claude/review-project-changes-ai5ls`

