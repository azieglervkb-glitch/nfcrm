# Week Selection Logik - Komplette Analyse

## ✅ Logik ist KORREKT

Die Bedingungslogik funktioniert korrekt für alle Szenarien:
- KW52 eingereicht, KW1 nicht → nur KW1 angezeigt ✅
- KW1 eingereicht, KW52 nicht → nur KW52 angezeigt ✅
- Beide eingereicht → beide angezeigt (Bearbeiten) ✅
- Keine eingereicht → beide angezeigt ✅

## 🔍 Mögliche Probleme

### Problem 1: weekStart wird nicht normalisiert beim Speichern

**Aktuell:**
```typescript
// In /api/member/kpi/full/route.ts Zeile 209-212
const weekStart = weekStartParam
  ? new Date(weekStartParam)
  : getPreviousWeek(getCurrentWeekStart());
```

**Problem:** Wenn `weekStartParam` ein String ist (z.B. "2024-12-30T00:00:00.000Z"), wird `new Date()` es parsen, aber die Zeit könnte unterschiedlich sein.

**Lösung:** `weekStart` beim Speichern normalisieren:
```typescript
const weekStart = weekStartParam
  ? normalizeWeekStart(new Date(weekStartParam))
  : getPreviousWeek(getCurrentWeekStart());
```

### Problem 2: Vergleich könnte fehlschlagen wegen Timezone

**Aktuell:**
```typescript
const normalizedPreviousWeek = normalizeWeekStart(previousWeek);
const entryWeek = normalizeWeekStart(new Date(entry.weekStart));
return entryWeek.getTime() === normalizedPreviousWeek.getTime();
```

**Problem:** Wenn `entry.weekStart` aus der DB kommt, könnte es ein Date-Objekt oder String sein. `new Date()` könnte unterschiedlich parsen.

**Lösung:** Sicherstellen, dass beide normalisiert werden:
```typescript
const entryWeek = normalizeWeekStart(
  entry.weekStart instanceof Date ? entry.weekStart : new Date(entry.weekStart)
);
```

### Problem 3: weekStart könnte mit Zeit gespeichert werden

Wenn `weekStart` beim Erstellen nicht normalisiert wird, könnte es mit einer Zeit gespeichert werden (z.B. 14:30:00 statt 00:00:00).

**Lösung:** Immer normalisieren beim Speichern:
```typescript
weekStart: normalizeWeekStart(weekStart),
```

## 📋 Empfohlene Änderungen

1. **weekStart beim Speichern normalisieren** in allen 3 APIs:
   - `/api/member/kpi/route.ts`
   - `/api/member/kpi/full/route.ts`
   - `/api/forms/weekly/[token]/route.ts`

2. **weekStart beim Lesen normalisieren** (bereits implementiert, aber sicherstellen)

3. **Debug-Logging hinzufügen** für besseres Debugging

## 🧪 Test-Szenarien

### Szenario A: Heute ist 30.12.2024 (KW52), KW52 bereits eingereicht
- Erwartet: Nur KW51 sollte angezeigt werden
- Aktuell: Sollte funktionieren, ABER wenn weekStart nicht normalisiert wurde, könnte es fehlschlagen

### Szenario B: Heute ist 06.01.2025 (KW1), KW52 bereits eingereicht
- Erwartet: Nur KW1 sollte angezeigt werden
- Aktuell: Sollte funktionieren

### Szenario C: weekStart wurde mit Zeit gespeichert (z.B. 14:30:00)
- Problem: Vergleich würde fehlschlagen, auch mit normalizeWeekStart
- Lösung: Beim Speichern normalisieren

