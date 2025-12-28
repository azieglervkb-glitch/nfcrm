# LearningSuite API Integration

## ✅ Implementiert

### 1. API Helper (`src/lib/learningsuite.ts`)

Die Integration verwendet die offizielle LearningSuite API v1.

**Authentifizierung:** `x-api-key` Header (NICHT Basic Auth)

**Hauptfunktionen:**
- `getMemberByEmail(email)` - Member anhand E-Mail finden
- `getMemberCourses(memberId)` - Kurse eines Members abrufen
- `getCourseModulesForMember(courseId, memberId)` - Module eines Kurses für Member
- `getMemberProgressByEmail(email)` - Vollständiger Fortschritt inkl. Modul-Berechnung
- `syncMemberWithLearninSuite(email)` - Sync für CRM-Integration
- `testApiConnection()` - API-Verbindung testen

### 2. API Workflow

```
E-Mail → GET /members?email={email} → Member-ID
Member-ID → GET /members/{id}/courses → Kurse mit Progress
Course-ID + Member-ID → GET /courses/{id}/modules?memberId={id} → Module
→ Berechnung: currentModule = erstes nicht-abgeschlossenes Modul
```

### 3. Webhook-Endpoint (`/api/webhooks/learningsuite`)
- Empfängt Benachrichtigungen bei Modul-Abschluss
- Syncs automatisch Member-Daten
- Aktiviert KPI-Tracking wenn Bedingungen erfüllt

### 4. Sync Cronjob (`/api/cron/sync-learningsuite`)
- Läuft stündlich (via crontab)
- Syncs alle aktiven Members mit LearningSuite
- Aktiviert KPI-Tracking automatisch wenn:
  - ✅ Onboarding abgeschlossen
  - ✅ Modul X erreicht (konfigurierbar)

## 🔧 Konfiguration

### Environment Variables

```env
LEARNINSUITE_API_KEY=dein_api_key_hier
```

**API Key generieren:**
1. In LearningSuite einloggen
2. Einstellungen → Integrationen
3. "API Key generieren" klicken

### Settings (in Database)
- `kpiTriggerSource`: "manual" | "learningsuite_api" | "both"
- `kpiTriggerModule`: Ab welchem Modul KPI-Tracking aktiviert wird (Standard: 2)

## 📋 Workflow

### Automatische Aktivierung via LearningSuite:
1. Member schließt Onboarding ab
2. Member erreicht Modul X in LearningSuite
3. Webhook oder Cronjob erkennt Modul-Erreichen
4. System prüft: Onboarding ✅ + Modul X ✅
5. KPI-Setup-E-Mail/WhatsApp wird gesendet

### Manuelle Aktivierung:
- Admin kann in Member-Liste Bulk-Action ausführen
- Prüft auch Onboarding + Modul (wenn LearningSuite aktiviert)

## 🔍 API-Endpunkte (LearningSuite API v1)

| Endpoint | Beschreibung |
|----------|--------------|
| `GET /members?email={email}` | Member per E-Mail finden |
| `GET /members/{id}` | Member-Details |
| `GET /members/{id}/courses` | Kurse eines Members |
| `GET /courses/{id}/modules?memberId={id}` | Module für Member |

## 🧪 Test-Endpoint

```
GET /api/test/learningsuite              → Verbindung testen
GET /api/test/learningsuite?email=x@y.de → Member-Lookup testen
```

**Beispiel Response:**
```json
{
  "success": true,
  "memberProgress": {
    "memberId": "member_abc123",
    "email": "max@example.com",
    "currentModule": 3,
    "totalProgress": 65,
    "courses": [
      {
        "title": "Hauptkurs",
        "progress": 65,
        "completedLessons": 13,
        "totalLessons": 20
      }
    ]
  }
}
```

## ⚠️ Wichtig

- **Onboarding ist IMMER Grundvoraussetzung** - auch bei LearningSuite-Trigger
- **API Key ist KEIN Base64** - direkter Key im `x-api-key` Header
- KPI-Setup-Mail wird NUR gesendet wenn beide Bedingungen erfüllt sind
- LearningSuite-Sync läuft stündlich automatisch

## 📊 Member-Ansicht

Das aktuelle Modul wird in der Member-Detailseite angezeigt:
- Aktuelles Modul (Nummer)
- Fortschritts-Name
- Letzter Sync-Zeitpunkt
- LearningSuite User-ID

---

*Dokumentation aktualisiert: 28.12.2024*
*Basierend auf LearningSuite API v1*
