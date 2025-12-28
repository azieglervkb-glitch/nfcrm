# NF Mentoring CRM - Member Flow Analyse

**Erstellt am:** 2025-01-XX  
**Zweck:** Vollständige Analyse des aktuellen Member-Onboarding-Flows und KPI-Tracking-Systems  
**Status:** PHASE 1 - Analyse abgeschlossen

---

## 📋 1. Bestandsaufnahme

### 1.1 Prisma Schema - Member Modell

**Aktuelle Felder:**

```prisma
model Member {
  // Onboarding Status
  onboardingCompleted  Boolean   @default(false)
  onboardingDate       DateTime?
  
  // KPI Tracking Setup (AKTUELL)
  kpiTrackingActive    Boolean   @default(false)
  kpiTrackingStartDate DateTime?
  hauptzielEinSatz     String?
  
  // KPI Checkboxen (was wird getrackt)
  trackKontakte        Boolean @default(false)
  trackTermine         Boolean @default(false)
  trackEinheiten       Boolean @default(false)
  trackEmpfehlungen    Boolean @default(false)
  trackEntscheider     Boolean @default(false)
  trackAbschluesse     Boolean @default(false)
  trackUmsatz          Boolean @default(true) // Immer aktiv
  
  // SOLL-Werte (Ziele)
  umsatzSollWoche          Decimal?
  umsatzSollMonat          Decimal?
  kontakteSoll             Int?
  entscheiderSoll          Int?
  termineVereinbartSoll    Int?
  termineStattgefundenSoll Int?
  termineAbschlussSoll     Int?
  einheitenSoll            Int?
  empfehlungenSoll         Int?
}
```

**FEHLENDE Felder (für Refactoring benötigt):**
- ❌ `onboardingSentAt` - Wann wurde Onboarding-E-Mail gesendet?
- ❌ `kpiTrackingEnabled` - Separates Flag für "aktiviert" vs "abgeschlossen"
- ❌ `kpiTrackingEnabledAt` - Wann wurde KPI-Tracking aktiviert?
- ❌ `kpiSetupCompleted` - Wurde KPI-Setup-Formular abgeschlossen?
- ❌ `kpiSetupCompletedAt` - Wann wurde Setup abgeschlossen?
- ❌ `kpiSetupSentAt` - Wann wurde KPI-Setup-Mail gesendet?
- ❌ `kpiSetupReminderCount` - Anzahl gesendeter Reminder
- ❌ `kpiSetupLastReminderAt` - Letzter Reminder-Zeitpunkt
- ❌ `learningSuiteUserId` - LearninSuite User ID
- ❌ `learningSuiteLastSync` - Letzter Sync-Zeitpunkt
- ❌ `currentModule` - Aktuelles Modul in LearninSuite
- ❌ `kpiSetupData` - JSON mit strukturierten Setup-Daten

### 1.2 SystemSettings Schema

**Aktuelle Felder:**
```prisma
model SystemSettings {
  id String @id @default("default")
  
  // KPI Reminder
  kpiReminderEnabled     Boolean @default(true)
  kpiReminderDay1        Int     @default(0)
  kpiReminderTime1       String  @default("18:00")
  kpiReminderDay2        Int     @default(1)
  kpiReminderTime2       String  @default("10:00")
  
  // AI Feedback
  aiFeedbackEnabled      Boolean @default(true)
  aiFeedbackDelayMin     Int     @default(60)
  aiFeedbackDelayMax     Int     @default(120)
  
  // Automations
  automationsEnabled     Boolean @default(true)
  automationsDay         Int     @default(1)
  automationsTime        String  @default("09:00")
}
```

**FEHLENDE Felder (für Refactoring benötigt):**
- ❌ `kpiTriggerModule` - Ab welchem Modul KPI-Tracking aktiviert wird (Default: 2)
- ❌ `kpiTriggerSource` - "manual" | "learningsuite_api" | "both" (Default: "manual")
- ❌ `kpiSetupReminderDays` - Int[] Array mit Reminder-Tagen (Default: [1, 3, 7])

---

## 📧 2. E-Mail & WhatsApp Trigger

### 2.1 Onboarding-E-Mail

**Aktueller Trigger:**
- ✅ **Copecart Webhook** (`/api/webhooks/copecart/route.ts`)
  - Wird gesendet wenn `order.completed` Event eintrifft
  - Erstellt Member + Onboarding-Token
  - Sendet E-Mail mit Link: `${process.env.APP_URL}/form/onboarding/${token}`

**PROBLEM:**
- ❌ **KEIN Trigger beim manuellen Member-Erstellen** (`/api/members` POST)
  - Admin kann Member erstellen, aber keine Onboarding-E-Mail wird gesendet
  - Member muss manuell Onboarding-Link erhalten

**E-Mail-Template:**
- Datei: `src/lib/email.ts` → `sendWelcomeEmail()`
- Wird NACH Onboarding-Formular-Abschluss gesendet
- Enthält KPI-Setup-Link

### 2.2 KPI-Setup-E-Mail

**Aktueller Trigger:**
- ✅ **Nach Onboarding-Formular-Abschluss** (`/api/forms/onboarding/[token]/route.ts`)
  - Zeile 164: `sendWelcomeEmail()` wird aufgerufen
  - Enthält KPI-Setup-Link: `${process.env.APP_URL}/form/kpi-setup/${kpiSetupToken}`

**PROBLEM:**
- ❌ Keine separate KPI-Setup-E-Mail, nur in Welcome-Email enthalten
- ❌ Kein WhatsApp-Versand für KPI-Setup
- ❌ Keine Reminder-Logik für unvollständiges KPI-Setup

### 2.3 KPI-Reminder (Wöchentlich)

**Aktueller Trigger:**
- ✅ **Cronjob:** `/api/cron/kpi-reminder/route.ts`
  - Sendet E-Mail + WhatsApp wenn Member keine KPIs eingetragen hat
  - Verwendet `FormToken` für sichere Links

**Reminder-Logik:**
- ✅ Automatisch via Cronjob
- ✅ Respektiert Quiet Hours
- ✅ Verwendet echte Form-Tokens

### 2.4 KPI-Setup-Reminder (FEHLT!)

**AKTUELL:**
- ❌ **KEINE Reminder-Logik** für unvollständiges KPI-Setup
- ❌ Keine automatischen Erinnerungen wenn Member KPI-Setup nicht abschließt

**BENÖTIGT:**
- ✅ Reminder nach 1, 3, 7 Tagen (konfigurierbar in Settings)
- ✅ E-Mail + WhatsApp
- ✅ Tracking von `kpiSetupReminderCount`

---

## 🔗 3. Formulare & Links

### 3.1 Onboarding-Formular

**Route:** `/api/forms/onboarding/[token]/route.ts`

**Zweck:**
- Member füllt Onboarding-Daten aus
- Setzt `onboardingCompleted = true`
- Erstellt Welcome-Call-Task
- Generiert KPI-Setup-Token
- Sendet Welcome-Email mit KPI-Setup-Link

**Token-System:**
- ✅ Verwendet `FormToken` Modell
- ✅ 7 Tage Gültigkeit
- ✅ Wird nach Verwendung als `usedAt` markiert

### 3.2 KPI-Setup-Formular

**Route:** `/api/forms/kpi-setup/[token]/route.ts`

**Zweck:**
- Member konfiguriert KPI-Tracking
- Setzt `kpiTrackingActive = true`
- Setzt `kpiTrackingStartDate = now()`
- Speichert SOLL-Werte

**Aktuelle Felder:**
- Checkboxen für zu trackende KPIs
- SOLL-Werte für jede KPI
- `hauptzielEinSatz` (Textfeld)

**FEHLT (basierend auf Screenshot):**
- ❌ Monatliches Umsatzziel (separat von wöchentlich)
- ❌ Konvertierungsraten (Kontakt → Termin, Termin → Abschluss)
- ❌ Strukturierte JSON-Speicherung (`kpiSetupData`)

### 3.3 Weekly KPI-Formular

**Route:** `/api/forms/weekly/[token]/route.ts`

**Zweck:**
- Member trägt wöchentliche IST-Werte ein
- Erstellt `KpiWeek` Eintrag
- Trigger AI-Feedback-Generierung

---

## 🐛 4. KRITISCHER BUG: Demo-Links

### 4.1 Problem-Identifikation

**Gefundene Stellen mit `localhost` Fallback:**

1. **`src/lib/email.ts`** (mehrfach):
   ```typescript
   process.env.APP_URL || "http://localhost:3000"
   ```

2. **`src/lib/automation/engine.ts`** (Zeile 1019):
   ```typescript
   ${process.env.APP_URL}/form/kpi-setup/${member.id}
   ```
   ⚠️ **PROBLEM:** Verwendet `member.id` statt Token!

3. **`src/app/api/cron/kpi-reminder/route.ts`** (Zeile 82):
   ```typescript
   const formLink = `${process.env.APP_URL || "http://localhost:3000"}/form/weekly/${token}`;
   ```

4. **`src/app/api/forms/onboarding/[token]/route.ts`** (Zeile 161):
   ```typescript
   const kpiSetupLink = `${process.env.APP_URL || "http://localhost:3000"}/form/kpi-setup/${kpiSetupToken}`;
   ```

5. **`src/app/api/webhooks/copecart/route.ts`** (Zeile 150):
   ```typescript
   const onboardingUrl = `${process.env.APP_URL}/form/onboarding/${token}`;
   ```
   ⚠️ **KEIN Fallback**, aber wenn `APP_URL` nicht gesetzt → `undefined/form/...`

### 4.2 Root Cause

**Hauptproblem:**
- `APP_URL` Environment-Variable ist möglicherweise nicht gesetzt
- Fallback zu `localhost:3000` führt zu Demo-Links in Produktion
- Keine Validierung ob `APP_URL` korrekt gesetzt ist

**Zusätzliches Problem:**
- In `automation/engine.ts` Zeile 1019 wird `member.id` direkt verwendet statt Token
- Das ist ein Sicherheitsrisiko (kein Token-System)

### 4.3 Lösung

**Sofort-Fix erforderlich:**
1. ✅ Validierung: `APP_URL` MUSS in Produktion gesetzt sein
2. ✅ Fehler werfen wenn `APP_URL` fehlt (statt Fallback)
3. ✅ Token-System für alle Formular-Links verwenden
4. ✅ `member.id` in Links durch Token ersetzen

---

## 🔄 5. Reminder-Logik

### 5.1 Aktuelle Reminder

**KPI-Weekly-Reminder:**
- ✅ Implementiert in `/api/cron/kpi-reminder/route.ts`
- ✅ Sendet E-Mail + WhatsApp
- ✅ Verwendet FormToken für sichere Links
- ✅ Respektiert Quiet Hours

**KPI-Setup-Reminder:**
- ❌ **NICHT IMPLEMENTIERT**
- ❌ Keine automatischen Erinnerungen
- ❌ Kein Tracking von Reminder-Count

### 5.2 Benötigte Reminder-Logik

**Für KPI-Setup:**
```typescript
// Pseudo-Code
async function checkKpiSetupReminders() {
  const settings = await getSettings();
  const pendingMembers = await prisma.member.findMany({
    where: {
      kpiTrackingEnabled: true,  // Aktiviert, aber nicht abgeschlossen
      kpiSetupCompleted: false,
      kpiSetupReminderCount: { lt: settings.kpiSetupReminderDays.length }
    }
  });
  
  for (const member of pendingMembers) {
    const daysSinceEnabled = daysBetween(member.kpiTrackingEnabledAt, now());
    const nextReminderDay = settings.kpiSetupReminderDays[member.kpiSetupReminderCount];
    
    if (daysSinceEnabled >= nextReminderDay) {
      await sendKpiSetupReminder(member, 'email');
      await sendKpiSetupReminder(member, 'whatsapp');
      await incrementReminderCount(member.id);
    }
  }
}
```

---

## 📊 6. Member Flow - Aktueller Zustand

### 6.1 Member-Erstellung (Manuell)

**Trigger:** Admin erstellt Member via `/api/members` POST

**Was passiert:**
1. ✅ Member wird in DB erstellt
2. ❌ **KEINE Onboarding-E-Mail wird gesendet**
3. ❌ **KEIN Onboarding-Token wird erstellt**
4. ❌ Member muss manuell Onboarding-Link erhalten

**PROBLEM:** Inkonsistent mit Copecart-Flow!

### 6.2 Member-Erstellung (Copecart Webhook)

**Trigger:** `order.completed` Event

**Was passiert:**
1. ✅ Member wird erstellt/aktualisiert
2. ✅ Onboarding-Token wird generiert
3. ✅ Onboarding-E-Mail wird gesendet
4. ✅ Automation-Log wird erstellt

**KORREKT:** Dieser Flow funktioniert!

### 6.3 Onboarding-Formular-Abschluss

**Trigger:** Member füllt Onboarding-Formular aus

**Was passiert:**
1. ✅ Member-Daten werden gespeichert
2. ✅ `onboardingCompleted = true`
3. ✅ Welcome-Call-Task wird erstellt
4. ✅ KPI-Setup-Token wird generiert
5. ✅ Welcome-Email mit KPI-Setup-Link wird gesendet

**PROBLEM:**
- ❌ KPI-Tracking wird NICHT automatisch aktiviert
- ❌ Member muss KPI-Setup selbst abschließen
- ❌ Keine Reminder wenn Setup nicht abgeschlossen wird

### 6.4 KPI-Setup-Abschluss

**Aktuell:**
- ✅ `kpiTrackingActive = true`
- ✅ `kpiTrackingStartDate = now()`
- ✅ SOLL-Werte werden gespeichert

**FEHLT:**
- ❌ `kpiSetupCompleted` Flag
- ❌ `kpiSetupCompletedAt` Timestamp
- ❌ Keine Bestätigungs-E-Mail/WhatsApp

---

## 🎯 7. LearninSuite API Integration

### 7.1 Recherche-Ergebnisse

**API-Dokumentation:**
- URL: https://api.learningsuite.io/api/v1/docs/
- ⚠️ **NICHT ZUGÄNGLICH** ohne Credentials

**Zu klärende Fragen:**
- ❓ Welche Endpoints existieren für User-Fortschritt?
- ❓ Kann man per Member-Email den Fortschritt abrufen?
- ❓ Gibt es Webhooks für Modul-Abschluss?
- ❓ Welche Authentifizierung wird benötigt?

**Benötigte Informationen:**
- [ ] API-Credentials (API-Key oder OAuth)
- [ ] Endpoint für User-Progress
- [ ] Endpoint für Module-Status
- [ ] Webhook-URL für Modul-Abschluss (falls verfügbar)

### 7.2 Geplante Integration

**Option A: Polling (Cronjob)**
```typescript
// Täglich prüfen
async function syncLearninSuiteProgress() {
  const members = await getMembersWithLearninSuite();
  for (const member of members) {
    const progress = await learninSuiteAPI.getUserProgress(member.email);
    if (progress.currentModule >= settings.kpiTriggerModule) {
      await activateKpiTracking(member.id);
    }
  }
}
```

**Option B: Webhook**
```typescript
// POST /api/webhooks/learningsuite
async function handleModuleCompletion(event) {
  const member = await findMemberByEmail(event.userEmail);
  if (event.moduleNumber >= settings.kpiTriggerModule) {
    await activateKpiTracking(member.id);
  }
}
```

---

## ✅ 8. Zusammenfassung & Action Items

### 8.1 Kritische Probleme (SOFORT zu beheben)

1. **🐛 Demo-Link Bug**
   - Problem: `APP_URL` Fallback zu `localhost:3000`
   - Lösung: Validierung + Fehler werfen wenn nicht gesetzt
   - Dateien: `src/lib/email.ts`, `src/lib/automation/engine.ts`, etc.

2. **🔒 Sicherheitsrisiko: Member-ID in Links**
   - Problem: `member.id` direkt in Formular-Links (Zeile 1019)
   - Lösung: Token-System verwenden
   - Datei: `src/lib/automation/engine.ts`

3. **📧 Fehlende Onboarding-E-Mail bei manueller Erstellung**
   - Problem: Admin erstellt Member, aber keine E-Mail
   - Lösung: Onboarding-E-Mail + Token in `/api/members` POST hinzufügen

### 8.2 Fehlende Features

1. **KPI-Setup-Reminder**
   - Status: ❌ Nicht implementiert
   - Benötigt: Reminder-Logik + Tracking-Felder

2. **LearninSuite Integration**
   - Status: ❌ Nicht implementiert
   - Benötigt: API-Credentials + Endpoints

3. **KPI-Tracking-Aktivierung via Settings**
   - Status: ❌ Nicht implementiert
   - Benötigt: Bulk-Action in Member-Liste

### 8.3 Schema-Erweiterungen benötigt

**Member-Modell:**
- `onboardingSentAt: DateTime?`
- `kpiTrackingEnabled: Boolean @default(false)`
- `kpiTrackingEnabledAt: DateTime?`
- `kpiSetupCompleted: Boolean @default(false)`
- `kpiSetupCompletedAt: DateTime?`
- `kpiSetupSentAt: DateTime?`
- `kpiSetupReminderCount: Int @default(0)`
- `kpiSetupLastReminderAt: DateTime?`
- `learningSuiteUserId: String?`
- `learningSuiteLastSync: DateTime?`
- `currentModule: Int?`
- `kpiSetupData: Json?`

**SystemSettings-Modell:**
- `kpiTriggerModule: Int @default(2)`
- `kpiTriggerSource: String @default("manual")`
- `kpiSetupReminderDays: Int[] @default([1, 3, 7])`

---

## 📝 Nächste Schritte

1. ✅ **PHASE 1 abgeschlossen** - Analyse dokumentiert
2. ⏭️ **PHASE 2:** Schema-Erweiterung + Migration
3. ⏭️ **PHASE 3:** Business Logic (Member Flow)
4. ⏭️ **PHASE 4:** KPI-Setup-Formular erweitern
5. ⏭️ **PHASE 5:** Settings UI
6. ⏭️ **PHASE 6:** Demo-Link Bug fixen
7. ⏭️ **PHASE 7:** LearninSuite Integration

---

**Ende der Analyse**

