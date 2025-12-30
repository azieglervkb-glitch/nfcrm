# NF CRM - Umfassende Systemanalyse

**Erstellt am:** 28. Dezember 2025
**Analyst:** Claude Code

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Member Portal Analyse](#2-member-portal-analyse)
3. [Admin Dashboard Analyse](#3-admin-dashboard-analyse)
4. [Cronjobs & Automations](#4-cronjobs--automations)
5. [API-Routen Analyse](#5-api-routen-analyse)
6. [Dummy/Test Content](#6-dummytest-content)
7. [Sicherheitsprobleme](#7-sicherheitsprobleme)
8. [Empfehlungen](#8-empfehlungen)

---

## 1. Executive Summary

### Projektübersicht
- **71 API-Routen** mit 107 HTTP-Methoden
- **26 Admin-Dashboard-Seiten**
- **7 Member-Portal-Seiten**
- **9 Cronjobs**
- **14 Automation Rules**
- **16 Message Templates**

### Kritische Befunde

| Priorität | Anzahl | Beschreibung |
|-----------|--------|--------------|
| KRITISCH | 4 | Sicherheitslücken (Auth, Webhooks, Setup) |
| HOCH | 6 | Fehlende Authentifizierung auf Member-APIs |
| MITTEL | 8 | Fehlende Navigation, Orphaned Pages, TypeScript |
| NIEDRIG | 10+ | Dummy Content, Console.logs, Cleanup |

---

## 2. Member Portal Analyse

### 2.1 Verfügbare Seiten

| Route | Datei | Funktion |
|-------|-------|----------|
| `/member/login` | `login/page.tsx` | Member-Login mit Access Code |
| `/member/logout` | `logout/page.tsx` | Logout |
| `/member/[id]` | `[memberId]/page.tsx` | Dashboard + KPI-Setup |
| `/member/[id]/kpi` | `kpi/page.tsx` | Weekly KPI Tracking |
| `/member/[id]/kpi/verlauf` | `kpi/verlauf/page.tsx` | KPI-Historie |
| `/member/[id]/profil` | `profil/page.tsx` | Profil (Read-only!) |
| `/member/[id]/ziele` | `ziele/page.tsx` | Ziele bearbeiten |

### 2.2 Member-Funktionen

**Was Member sehen können:**
- Dashboard mit aktuellem KPI-Fortschritt
- Wöchentlicher Score (%)
- Streak-Anzeige
- Ziele und Targets
- KPI-Historie (letzte 12 Wochen)
- Feeling Score und Reflexionen
- Profildaten (Name, Email, Status)

**Was Member bearbeiten können:**
- Weekly KPIs (einmal pro Woche)
- Ziele (Umsatz, Aktivitätsziele)
- Feeling Score + Reflexionstexte

**Was Member NICHT bearbeiten können:**
- Email/Telefon (kein UI vorhanden!)
- Access Code
- Membership Status
- Produkte

### 2.3 KRITISCHE SICHERHEITSPROBLEME

#### Problem 1: Keine Route Protection
```
Datei: /src/app/member/[memberId]/* (alle Seiten)
Schwere: KRITISCH

Es gibt KEIN layout.tsx mit Session-Check!
Jeder kann direkt /member/{beliebige-memberId} aufrufen.
```

#### Problem 2: Direct Session Hijacking
```typescript
// Datei: /src/app/member/[memberId]/page.tsx (Zeile 133-137)
const sessionResponse = await fetch("/api/member/auth/direct", {
  method: "POST",
  body: JSON.stringify({ memberId }), // <- Keine Validierung!
});
```

#### Problem 3: Schwaches Access Code System
```typescript
// Datei: /src/app/api/member/auth/login/route.ts (Zeile 34-42)
const expectedCode = member.id.slice(-6).toUpperCase();
// Access Code = letzte 6 Zeichen der Member-ID (vorhersehbar!)
```

### 2.4 KPI Tracking Workflow

**Setup Flow:**
1. Member erhält Setup-Link per Email/WhatsApp
2. Wählt zu trackende KPIs aus
3. Setzt Zielwerte
4. Setup kann später wiederholt werden

**Weekly Flow:**
1. Member erhält Weekly-Link (Montags)
2. Trägt Ist-Werte ein
3. Feeling Score + Reflexion
4. **ACHTUNG:** KPIs sind nach Abgabe UNVERÄNDERBAR!
5. AI Feedback wird generiert (60-120 Min Delay)

---

## 3. Admin Dashboard Analyse

### 3.1 Verfügbare Seiten (26 Seiten)

**Hauptbereiche:**
- `/dashboard` - Übersicht mit Statistiken
- `/members` - Mitgliederverwaltung (Liste, Detail, Edit, Neu)
- `/leads` - Lead-Management (Kanban)
- `/kpis` - KPI-Übersicht + Pending
- `/tasks` - Aufgabenverwaltung
- `/automations` - Rules + Logs
- `/upsell` - Upsell Pipeline (Kanban)
- `/communications` - Nachrichten-Log
- `/templates` - Email/WhatsApp Templates
- `/settings` - 7 Einstellungsseiten
- `/reports` - 3 Report-Seiten (VERSTECKT!)

### 3.2 Settings-Seiten

| Route | Funktion | Schutz |
|-------|----------|--------|
| `/settings` | Systemeinstellungen | Admin-Check ✓ |
| `/settings/team` | Team-Verwaltung | FEHLT! |
| `/settings/profile` | Profil + 2FA | FEHLT! |
| `/settings/prompts` | AI-Prompts | FEHLT! |
| `/settings/integrations` | API-Keys | FEHLT! |
| `/settings/forms` | Formular-Links | FEHLT! |

### 3.3 PROBLEME

#### Problem 1: Reports nicht erreichbar
```
Dateien existieren:
- /reports/page.tsx
- /reports/performance/page.tsx
- /reports/retention/page.tsx

ABER: Keine Links in der Sidebar! (sidebar.tsx Zeile 49-100)
```

#### Problem 2: Orphaned Templates Page
```
Zwei Template-Seiten existieren:
- /templates/page.tsx (1014 Zeilen) <- Aktiv
- /communications/templates/page.tsx (439 Zeilen) <- Verwaist!
```

#### Problem 3: Fehlende Role Checks
```
Nur /settings/page.tsx hat Admin-Redirect.
Alle anderen Settings-Seiten haben KEINEN Schutz!
```

---

## 4. Cronjobs & Automations

### 4.1 Cronjobs (9 Jobs)

| Job | Schedule | Funktion |
|-----|----------|----------|
| `kpi-reminder` | So 18:00, Mo 10:00 | KPI-Erinnerungen |
| `kpi-setup-reminders` | Täglich 10:30 | Setup-Erinnerungen |
| `onboarding-reminders` | Täglich 10:00 | Onboarding-Reminder |
| `weekly-reminders` | Täglich 06:00 + 19:00 | Email + WhatsApp |
| `scheduled-automations` | Mo 09:00 | Churn-Risk, Danger Zone |
| `send-feedback` | Alle 5 Min | AI-Feedback senden |
| `sync-learningsuite` | Stündlich | LearninSuite Sync |
| `system-health` | Täglich 07:00 | System-Diagnose |
| `status` | On-Demand | Cron-Status anzeigen |

### 4.2 Automation Rules (14 Rules)

#### Risk & Retention
| ID | Name | Trigger | Aktion |
|----|------|---------|--------|
| R1 | Low-Feeling-Streak | 3 Wochen Feeling < 5 | Task HIGH + reviewFlag |
| R2 | Silent Member | Keine KPI diese Woche | Email + WhatsApp |
| R3 | Leistungsabfall | 2 Wochen < 60% Umsatz | Task URGENT + dangerZone |

#### Performance & Upside
| ID | Name | Trigger | Aktion |
|----|------|---------|--------|
| P1 | Upsell-Signal | 3+ Monate > 20k€ | upsellCandidate + Pipeline |
| P2 | Funnel-Leak | Konversionsrate < 30% | Task MEDIUM |
| P3 | Momentum-Streak | 3 Wochen >= 100% | WhatsApp Celebration |

#### Quality & Data
| ID | Name | Trigger | Aktion |
|----|------|---------|--------|
| Q1 | High No-Show | Quote >= 30% | Task MEDIUM |
| Q2 | Data Anomaly | Negative/unrealistische Werte | AI-Block + reviewFlag |
| Q3 | Missing Fields | Tracked Feld leer | WhatsApp Nudge |

#### Coaching
| ID | Name | Trigger | Aktion |
|----|------|---------|--------|
| C1 | Heldentat-Amplify | Heldentat eingegeben | Pinned Note |
| C2 | Blockade Active | Blockade + Feeling <= 5 | AI-Block + Task HIGH |
| C3 | SMART-Nudge | Keine Ziele definiert | WhatsApp Setup-Link |

#### Lifecycle
| ID | Name | Trigger | Aktion |
|----|------|---------|--------|
| L1 | Kündigungsrisiko | 2+ Wochen ohne KPI | Task URGENT + churnRisk |
| L2 | Happy Performer | Feeling >= 8 + Ziel erreicht | upsellCandidate |

### 4.3 Cooldown-System

| Rule | Cooldown |
|------|----------|
| R1, P2, C1, C2, C3, Q3 | 7 Tage |
| R3, Q1, L1 | 14 Tage |
| P1, P3, L2 | 30 Tage |
| R2 | 2 Tage (Anti-Spam) |

---

## 5. API-Routen Analyse

### 5.1 Übersicht

- **71 API-Dateien**
- **107 HTTP-Methoden**
- **65 geschützte Routen**
- **6 ungeschützte Routen** (problematisch!)

### 5.2 Ungeschützte Member-APIs

| Route | Problem |
|-------|---------|
| `/api/member/kpi/full` | Akzeptiert memberId ohne Auth |
| `/api/member/goals` | GET/PUT ohne Auth |
| `/api/member/kpi-setup` | POST ohne Auth |
| `/api/member/dashboard` | GET ohne Auth |
| `/api/member/profile` | GET ohne Auth |
| `/api/member/auth/direct` | Session ohne Validierung! |

### 5.3 Webhook-Probleme

```typescript
// Datei: /api/webhooks/learningsuite/route.ts (Zeile 27)
// TODO: Implement signature verification <- NICHT IMPLEMENTIERT!
```

### 5.4 Setup-Endpoint Problem

```typescript
// Datei: /api/setup/route.ts
// Hardcoded Setup-Key: "nf-setup-2024-init" (leicht zu erraten!)
// Hardcoded Password: "admin123"
```

---

## 6. Dummy/Test Content

### 6.1 Hardcoded Credentials

| Datei | Zeile | Problem |
|-------|-------|---------|
| `prisma/seed.ts` | 17 | `admin123` Password |
| `prisma/seed.ts` | 495-498 | Login-Daten im Output |
| `api/setup/route.ts` | 30, 67 | `admin123` Fallback |

### 6.2 Test-Emails

| Datei | Zeile | Email |
|-------|-------|-------|
| `seed.ts` | 20, 23 | admin@nf-mentoring.de |
| `seed.ts` | 36, 39 | coach@nf-mentoring.de |
| `seed.ts` | 53, 56 | thomas.mueller@example.com |
| `seed.ts` | 91, 94 | sarah.schmidt@example.com |
| `seed.ts` | 131, 134 | peter.weber@example.com |
| `seed.ts` | 471, 474 | neu.mitglied@example.com |

### 6.3 Test-Tokens

| Datei | Zeile | Token |
|-------|-------|-------|
| `seed.ts` | 450 | test-weekly-token-thomas |
| `seed.ts` | 461 | test-kpi-setup-token-peter |
| `seed.ts` | 484 | test-onboarding-token-new |

### 6.4 Hardcoded Fallback Secrets

| Datei | Zeile | Problem |
|-------|-------|---------|
| `api/member/auth/verify` | 7 | `member-portal-secret-key` Fallback |
| `api/member/auth/login` | 7 | `member-portal-secret-key` Fallback |

### 6.5 Console.log Statements

- **45+ Debug-Statements** in `/lib/automation/engine.ts`
- **5+ console.error** in API-Routen
- **Seed.ts** hat legitimerweise viele Logs

### 6.6 TODO Comments

```typescript
// Datei: /api/webhooks/learningsuite/route.ts (Zeile 27)
// TODO: Implement signature verification
```

---

## 7. Sicherheitsprobleme

### 7.1 KRITISCH (Sofort beheben!)

| # | Problem | Datei | Lösung |
|---|---------|-------|--------|
| 1 | Keine Member-Auth auf Seiten | `/member/[id]/*` | Layout.tsx mit Session-Check |
| 2 | Direct Session Hijacking | `/api/member/auth/direct` | Endpoint entfernen oder sichern |
| 3 | Webhook ohne Signatur | `/api/webhooks/learningsuite` | HMAC-Verifikation implementieren |
| 4 | Setup mit schwachem Key | `/api/setup` | Starkes Secret, Endpoint deaktivieren |

### 7.2 HOCH (Diese Woche beheben)

| # | Problem | Datei | Lösung |
|---|---------|-------|--------|
| 5 | Schwacher Access Code | `/api/member/auth/login` | Zufällige Codes oder OTP |
| 6 | Member-APIs ohne Auth | `/api/member/*` | Session-Validierung |
| 7 | Settings ohne Role-Check | `/settings/*` | Admin-Redirect hinzufügen |
| 8 | Kein Rate Limiting | Alle Public Endpoints | Rate Limiter implementieren |

### 7.3 MITTEL (Diesen Monat beheben)

| # | Problem | Datei | Lösung |
|---|---------|-------|--------|
| 9 | Reports nicht erreichbar | `sidebar.tsx` | Navigation hinzufügen |
| 10 | Orphaned Templates Page | `/communications/templates` | Datei löschen |
| 11 | TypeScript `any` | `/members/page.tsx:25` | Proper Types |
| 12 | Profile nicht editierbar | `/member/[id]/profil` | Edit-Dialog hinzufügen |

---

## 8. Empfehlungen

### 8.1 Sofortmaßnahmen (Priorität 1)

1. **Member-Portal absichern:**
   ```typescript
   // Neue Datei: /src/app/member/[memberId]/layout.tsx
   import { redirect } from "next/navigation";
   import { verifyMemberSession } from "@/lib/member-auth";

   export default async function MemberLayout({ children, params }) {
     const session = await verifyMemberSession();
     if (!session || session.memberId !== params.memberId) {
       redirect("/member/login");
     }
     return children;
   }
   ```

2. **Direct Auth Endpoint deaktivieren oder sichern**

3. **Webhook Signature Verification implementieren**

4. **Setup Endpoint mit starkem Secret sichern**

### 8.2 Kurzfristig (Diese Woche)

1. Rate Limiting auf Login-Endpoints
2. Member-APIs mit Session-Validierung
3. Reports in Sidebar Navigation
4. Orphaned Templates Page löschen
5. Admin Role Checks auf alle Settings-Seiten

### 8.3 Mittelfristig (Dieser Monat)

1. Access Code System überarbeiten (OTP)
2. Profile Edit UI im Member Portal
3. KPI-Korrektur-Workflow
4. TypeScript Cleanup
5. Console.log Statements entfernen

### 8.4 Langfristig (Nächstes Quartal)

1. OAuth2 für Member-Auth
2. CSRF Protection
3. Audit Logging
4. API Key Management
5. Penetration Testing

---

## Anhang: Dateiübersicht

### Member Portal
```
/src/app/member/
├── login/page.tsx (143 Zeilen)
├── logout/page.tsx (24 Zeilen)
└── [memberId]/
    ├── page.tsx (765 Zeilen) - Dashboard + Setup
    ├── kpi/
    │   ├── page.tsx (697 Zeilen) - Weekly Form
    │   └── verlauf/page.tsx (392 Zeilen) - Historie
    ├── profil/page.tsx (268 Zeilen) - Profil
    └── ziele/page.tsx (496 Zeilen) - Ziele
```

### Admin Dashboard
```
/src/app/(dashboard)/
├── dashboard/page.tsx
├── members/ (4 Seiten)
├── leads/ (1 Seite)
├── kpis/ (2 Seiten)
├── tasks/ (1 Seite)
├── automations/ (2 Seiten)
├── upsell/ (1 Seite)
├── communications/ (2 Seiten - 1 orphaned!)
├── templates/ (1 Seite)
├── reports/ (3 Seiten - VERSTECKT!)
└── settings/ (7 Seiten)
```

### API-Routen
```
/src/app/api/
├── auth/ (NextAuth)
├── member/ (12 Endpoints)
├── members/ (6 Endpoints)
├── forms/ (3 Token-basierte Forms)
├── cron/ (9 Cronjobs)
├── automations/ (2 Endpoints)
├── webhooks/ (3 Endpoints)
├── templates/ (3 Endpoints)
├── settings/ (6 Endpoints)
├── tasks/ (3 Endpoints)
├── leads/ (4 Endpoints)
├── reports/ (3 Endpoints)
├── team/ (3 Endpoints)
└── debug/ + test/ (Sollten entfernt werden!)
```

---

*Report erstellt von Claude Code Systemanalyse*
