# 🔄 Automation & Cronjobs Setup Checkliste

## ✅ Was bereits funktioniert

### **KPI-Submission Automations** (Trigger: Bei KPI-Abgabe)
- ✅ `runKpiAutomations()` wird bei KPI-Submission aufgerufen
- ✅ Alle Rules werden automatisch geprüft:
  - R1: Low-Feeling-Streak
  - R3: Leistungsabfall
  - P1: Upsell-Signal
  - P2: Funnel-Leak
  - P3: Momentum-Streak
  - Q1: No-Show hoch
  - Q2: Daten-Anomalie
  - Q3: Feld fehlt aber getrackt
  - C1: Heldentat-Amplify
  - C2: Blockade aktiv
  - C3: S.M.A.R.T-Nudge
  - P2: Goal Celebration
  - L2: Happy High Performer

---

## ❌ Was fehlt für vollständige Automations

### **1. Environment Variables**

#### **CRON_SECRET** (WICHTIG!)
- **Status:** ❌ Aktuell: `Empty`
- **Zweck:** Schutz der Cron-Endpoints
- **Setup:**
  ```bash
  # Generiere Secret:
  openssl rand -base64 32
  
  # In Coolify → Environment Variables:
  CRON_SECRET=<generierter-secret>
  ```

#### **APP_URL** (WICHTIG!)
- **Status:** ❌ Nicht gesetzt
- **Zweck:** Links in E-Mails/WhatsApp
- **Setup:**
  ```bash
  # In Coolify → Environment Variables:
  APP_URL=https://nf-kpi.outrnk.io
  ```

---

### **2. Cronjobs einrichten**

#### **Option A: Coolify Scheduled Tasks** (EMPFOHLEN)

In Coolify → Application → **Scheduled Tasks**:

| Task | Schedule | Endpoint | Beschreibung |
|------|----------|----------|--------------|
| **KPI Reminder** | `0 10 * * 1` (Mo 10:00)<br>`0 18 * * 0` (So 18:00) | `GET /api/cron/kpi-reminder` | Erinnert Members ohne KPI |
| **Scheduled Automations** | `0 9 * * 1` (Mo 9:00) | `GET /api/cron/scheduled-automations` | Churn Risk & Danger Zone |
| **Send Feedback** | `*/5 * * * *` (alle 5 Min) | `GET /api/cron/send-feedback` | Scheduled WhatsApp Feedback |

**Header für alle Tasks:**
```
Authorization: Bearer <CRON_SECRET>
```

---

#### **Option B: Externer Cron-Service** (z.B. cron-job.org)

1. **KPI Reminder** (2x pro Woche)
   - URL: `https://nf-kpi.outrnk.io/api/cron/kpi-reminder`
   - Schedule: Sonntag 18:00 + Montag 10:00
   - Header: `Authorization: Bearer <CRON_SECRET>`

2. **Scheduled Automations** (1x pro Woche)
   - URL: `https://nf-kpi.outrnk.io/api/cron/scheduled-automations`
   - Schedule: Montag 9:00
   - Header: `Authorization: Bearer <CRON_SECRET>`

3. **Send Feedback** (alle 5 Minuten)
   - URL: `https://nf-kpi.outrnk.io/api/cron/send-feedback`
   - Schedule: `*/5 * * * *`
   - Header: `Authorization: Bearer <CRON_SECRET>`

---

#### **Option C: VPS Crontab** (falls kein Coolify)

```bash
# SSH auf VPS
ssh ubuntu@162.19.249.244

# Crontab bearbeiten
crontab -e

# Folgende Zeilen hinzufügen:
# KPI Reminder (So 18:00 + Mo 10:00)
0 18 * * 0 curl -H "Authorization: Bearer <CRON_SECRET>" https://nf-kpi.outrnk.io/api/cron/kpi-reminder
0 10 * * 1 curl -H "Authorization: Bearer <CRON_SECRET>" https://nf-kpi.outrnk.io/api/cron/kpi-reminder

# Scheduled Automations (Mo 9:00)
0 9 * * 1 curl -H "Authorization: Bearer <CRON_SECRET>" https://nf-kpi.outrnk.io/api/cron/scheduled-automations

# Send Feedback (alle 5 Min)
*/5 * * * * curl -H "Authorization: Bearer <CRON_SECRET>" https://nf-kpi.outrnk.io/api/cron/send-feedback
```

---

### **3. Automation Rules die Cronjobs brauchen**

#### **R2: Silent Member** (checkSilentMember)
- **Status:** ⚠️ Funktion existiert, wird aber nicht automatisch getriggert
- **Lösung:** Muss in `runScheduledAutomations()` oder separaten Cron integriert werden
- **Empfehlung:** Täglich um 10:00 prüfen

#### **M1: Weekly-Reminder Process** (runWeeklyReminders)
- **Status:** ⚠️ Funktion existiert (`runWeeklyReminders()`), wird aber nie aufgerufen
- **Lösung:** Cronjob einrichten der diese Funktion aufruft
- **Empfehlung:** Täglich um 6:00 (Morning) + 19:00 (Evening)

---

## 📋 Vollständige Setup-Anleitung

### **Schritt 1: Environment Variables setzen**

1. Öffne Coolify → Application → **Environment Variables**
2. Füge hinzu:
   ```env
   CRON_SECRET=<generierter-secret>
   APP_URL=https://nf-kpi.outrnk.io
   ```
3. **Redeploy** Application

---

### **Schritt 2: Coolify Scheduled Tasks einrichten**

1. Coolify → Application → **Scheduled Tasks**
2. Klicke **+ New Scheduled Task**

**Task 1: KPI Reminder**
- **Name:** `KPI Reminder`
- **Schedule:** `0 10 * * 1,0 18 * * 0` (oder 2 separate Tasks)
- **Command:** 
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" https://nf-kpi.outrnk.io/api/cron/kpi-reminder
  ```

**Task 2: Scheduled Automations**
- **Name:** `Scheduled Automations`
- **Schedule:** `0 9 * * 1` (Montag 9:00)
- **Command:**
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" https://nf-kpi.outrnk.io/api/cron/scheduled-automations
  ```

**Task 3: Send Feedback**
- **Name:** `Send Feedback`
- **Schedule:** `*/5 * * * *` (alle 5 Minuten)
- **Command:**
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" https://nf-kpi.outrnk.io/api/cron/send-feedback
  ```

---

### **Schritt 3: Fehlende Automations integrieren**

#### **R2: Silent Member** in Scheduled Automations einbauen:

**Datei:** `src/app/api/cron/scheduled-automations/route.ts`

Nach Zeile 143 hinzufügen:
```typescript
import { checkSilentMember } from "@/lib/automation/engine";

// ... im Loop nach Zeile 143:
await checkSilentMember(member);
```

#### **M1: Weekly Reminders** als separater Cron:

**Neue Datei:** `src/app/api/cron/weekly-reminders/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { runWeeklyReminders } from "@/lib/automation/engine";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runWeeklyReminders();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Cronjob:** Täglich um 6:00 + 19:00

---

## 🧪 Testing

### **Manuell testen:**

```bash
# 1. KPI Reminder testen
curl -H "Authorization: Bearer <CRON_SECRET>" \
  https://nf-kpi.outrnk.io/api/cron/kpi-reminder

# 2. Scheduled Automations testen
curl -H "Authorization: Bearer <CRON_SECRET>" \
  https://nf-kpi.outrnk.io/api/cron/scheduled-automations

# 3. Send Feedback testen
curl -H "Authorization: Bearer <CRON_SECRET>" \
  https://nf-kpi.outrnk.io/api/cron/send-feedback
```

---

## 📊 Automation Rules Übersicht

| Rule | Trigger | Status | Benötigt Cron? |
|------|---------|--------|----------------|
| **R1:** Low-Feeling-Streak | KPI-Submission | ✅ | ❌ |
| **R2:** Silent Member | Scheduled | ⚠️ | ✅ (fehlt) |
| **R3:** Leistungsabfall | KPI-Submission | ✅ | ❌ |
| **P1:** Upsell-Signal | KPI-Submission | ✅ | ❌ |
| **P2:** Funnel-Leak | KPI-Submission | ✅ | ❌ |
| **P3:** Momentum-Streak | KPI-Submission | ✅ | ❌ |
| **Q1:** No-Show hoch | KPI-Submission | ✅ | ❌ |
| **Q2:** Daten-Anomalie | KPI-Submission | ✅ | ❌ |
| **Q3:** Feld fehlt | KPI-Submission | ✅ | ❌ |
| **C1:** Heldentat | KPI-Submission | ✅ | ❌ |
| **C2:** Blockade | KPI-Submission | ✅ | ❌ |
| **C3:** S.M.A.R.T-Nudge | KPI-Submission | ✅ | ❌ |
| **P2:** Goal Celebration | KPI-Submission | ✅ | ❌ |
| **L1:** Churn Risk | Scheduled | ✅ | ✅ (Cron vorhanden) |
| **L2:** Happy High Performer | KPI-Submission | ✅ | ❌ |
| **M1:** Weekly Reminders | Scheduled | ⚠️ | ✅ (fehlt) |

---

## 🎯 Prioritäten

### **HOCH (sofort nötig):**
1. ✅ `CRON_SECRET` setzen
2. ✅ `APP_URL` setzen
3. ✅ Cronjobs einrichten (3 Tasks)

### **MITTEL (wichtig für vollständige Automations):**
4. ⚠️ R2 (Silent Member) in Scheduled Automations integrieren
5. ⚠️ M1 (Weekly Reminders) als separater Cron einrichten

### **NIEDRIG (optional):**
6. Monitoring/Logging für Cronjobs
7. Error-Alerts bei fehlgeschlagenen Cronjobs

---

## ✅ Checkliste zum Abhaken

- [ ] `CRON_SECRET` in Environment Variables gesetzt
- [ ] `APP_URL` in Environment Variables gesetzt
- [ ] Application neu deployed
- [ ] Cronjob 1: KPI Reminder eingerichtet
- [ ] Cronjob 2: Scheduled Automations eingerichtet
- [ ] Cronjob 3: Send Feedback eingerichtet
- [ ] R2 (Silent Member) in Scheduled Automations integriert
- [ ] M1 (Weekly Reminders) als separater Cron eingerichtet
- [ ] Alle Cronjobs manuell getestet
- [ ] Automation Logs geprüft (Dashboard → Automationen → Logs)

---

**Fertig!** 🎉 Nach dieser Checkliste sollten alle Automations vollständig funktionieren.

