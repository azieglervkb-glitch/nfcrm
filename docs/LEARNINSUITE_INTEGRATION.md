# LearninSuite API Integration

## ✅ Implementiert

### 1. API Helper (`src/lib/learningsuite.ts`)
- `getUserProgressByEmail()` - Findet User anhand E-Mail
- `getCurrentModule()` - Gibt aktuelles Modul zurück
- `hasCompletedModule()` - Prüft ob Modul abgeschlossen
- `syncMemberWithLearninSuite()` - Sync Member-Daten mit LearninSuite

### 2. Webhook-Endpoint (`/api/webhooks/learningsuite`)
- Empfängt Benachrichtigungen bei Modul-Abschluss
- Syncs automatisch Member-Daten
- Aktiviert KPI-Tracking wenn Bedingungen erfüllt sind

### 3. Sync Cronjob (`/api/cron/sync-learningsuite`)
- Läuft stündlich (via crontab)
- Syncs alle aktiven Members mit LearninSuite
- Aktiviert KPI-Tracking automatisch wenn:
  - ✅ Onboarding abgeschlossen (Grundvoraussetzung)
  - ✅ Modul X erreicht (zusätzliche Regel)

### 4. KPI-Aktivierung Logik angepasst
- `activateKpiTracking()` prüft jetzt:
  1. Onboarding muss abgeschlossen sein
  2. Modul X muss erreicht sein (wenn LearninSuite aktiviert)
- Gibt detaillierte Fehlermeldungen zurück

## 🔧 Konfiguration

### Environment Variables
```env
LEARNINSUITE_API_KEY=Y2x3YzBkNGY3MWwyY3o0YXVsbms4MXlidDpjOTM1N2Y3ZGE2OTEyZTcxOGUxN2U0OTA1ZDhiZjllNjE5YjkxOWNmYzQxZjRjMGIxMGZkNjg1MWVmNzhlMjk1
LEARNINSUITE_WEBHOOK_SECRET=optional_secret_for_webhook_verification
```

### Settings (in Database)
- `kpiTriggerSource`: "manual" | "learningsuite_api" | "both"
- `kpiTriggerModule`: Ab welchem Modul KPI-Tracking aktiviert wird (Standard: 2)

## 📋 Workflow

### Automatische Aktivierung via LearninSuite:
1. Member schließt Onboarding ab
2. Member erreicht Modul X in LearninSuite
3. Webhook oder Cronjob erkennt Modul-Erreichen
4. System prüft: Onboarding ✅ + Modul X ✅
5. KPI-Setup-E-Mail/WhatsApp wird gesendet

### Manuelle Aktivierung:
- Admin kann in Member-Liste Bulk-Action ausführen
- Prüft auch Onboarding + Modul (wenn LearninSuite aktiviert)

## 🔍 API-Endpunkte

Die LearninSuite API-Endpunkte müssen noch getestet werden:
- `/api/v1/users?email={email}` - User per E-Mail finden
- `/api/v1/users/{id}/progress` - Detaillierter Fortschritt

Falls die Endpunkte anders sind, müssen sie in `src/lib/learningsuite.ts` angepasst werden.

## ⚠️ Wichtig

- **Onboarding ist IMMER Grundvoraussetzung** - auch bei LearninSuite-Trigger
- KPI-Setup-Mail wird NUR gesendet wenn beide Bedingungen erfüllt sind
- LearninSuite-Sync läuft stündlich automatisch

