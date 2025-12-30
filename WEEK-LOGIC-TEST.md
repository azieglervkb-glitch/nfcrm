# Week Selection Logik - Detaillierter Test

## Beispiel: Heute ist 30.12.2024 (Montag, KW1)

### Berechnung:
1. `getCurrentWeekStart()` → 30.12.2024 00:00:00 (Montag KW1)
2. `getPreviousWeek(30.12.2024)` → 23.12.2024 00:00:00 (Montag KW52)

### Szenario: Peter hat KW52 bereits getrackt

**Datenbank:**
- Peter hat `KpiWeek` mit `weekStart = 23.12.2024` (KW52)

**Prüfung:**
1. `normalizedPreviousWeek = normalizeWeekStart(23.12.2024)` → 23.12.2024 00:00:00
2. `previousWeekEntry = find(weekStart === 23.12.2024)` → ✅ GEFUNDEN
3. `previousWeekSubmitted = true` ✅

4. `normalizedCurrentWeek = normalizeWeekStart(30.12.2024)` → 30.12.2024 00:00:00
5. `currentWeekEntry = find(weekStart === 30.12.2024)` → ❌ NICHT GEFUNDEN
6. `currentWeekSubmitted = false` ✅

**availableWeeks Array:**
- KW52 wird NICHT hinzugefügt: `!true || (true && false)` = `false || false` = `false` ✅
- KW1 wird hinzugefügt: `!false || (true && false)` = `true || false` = `true` ✅

**KW1 Objekt:**
```typescript
{
  weekStart: "2024-12-30T00:00:00.000Z",
  label: "KW1 (29.12. - 04.01.2026)",
  weekNumber: 1,
  isDefault: true, // previousWeekSubmitted && !currentWeekSubmitted = true && true = true
  isPreviousWeek: false, // ✅ KORREKT - KW1 ist die aktuelle Woche!
  alreadySubmitted: false
}
```

**Frontend:**
- Zeigt: "KW1 (29.12. - 04.01.2026)"
- Prüft: `week.isPreviousWeek && " (Vorwoche)"` → `false && " (Vorwoche)"` → kein Label ✅

**Ergebnis:** ✅ KORREKT - KW1 wird ohne "(Vorwoche)" angezeigt!

---

## Weitere Szenarien

### Szenario B: Keine eingereicht
- KW52: `isPreviousWeek = true` → zeigt "(Vorwoche)" ✅
- KW1: `isPreviousWeek = false` → kein Label ✅

### Szenario C: Beide eingereicht
- KW52: `isPreviousWeek = true` → zeigt "(Vorwoche)" ✅
- KW1: `isPreviousWeek = false` → kein Label ✅

### Szenario D: KW1 eingereicht, KW52 nicht
- KW52: `isPreviousWeek = true` → zeigt "(Vorwoche)" ✅
- KW1: wird nicht angezeigt (weil eingereicht) ✅

## ✅ Alle Szenarien sind korrekt!

