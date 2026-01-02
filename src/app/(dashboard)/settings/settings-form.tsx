"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Mail, MessageSquare, Brain, Bell, Clock, AlertTriangle, TrendingUp, Loader2, Check, Activity, CheckCircle2, XCircle, AlertCircle, RefreshCw, Bot, Shield, Sparkles, UserPlus, Lock } from "lucide-react";
import { toast } from "sonner";
import { InfoTooltip, DefinedTooltip } from "@/components/ui/info-tooltip";

interface SystemSettings {
  id: string;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  kpiReminderEnabled: boolean;
  kpiReminderDay1: number;
  kpiReminderTime1: string;
  kpiReminderDay2: number;
  kpiReminderTime2: string;
  kpiReminderChannels: string[];
  // KPI Tracking Window Settings
  kpiTrackingWindowOpenDay: number;
  kpiTrackingWindowOpenTime: string;
  kpiTrackingWindowCloseDay: number;
  kpiTrackingWindowCloseTime: string;
  aiFeedbackEnabled: boolean;
  aiFeedbackDelay: number;
  aiFeedbackDelayMin: number;
  aiFeedbackDelayMax: number;
  aiFeedbackChannels: string[];
  automationsEnabled: boolean;
  automationsDay: number;
  automationsTime: string;
  churnRiskWeeks: number;
  dangerZoneWeeks: number;
  upsellRevenueThreshold: number;
  upsellConsecutiveWeeks: number;
  coachEmailNotifications: boolean;
  adminEmailDigest: boolean;
  adminEmailDigestTime: string;
  kpiTriggerModule: number;
  kpiTriggerSource: string;
  kpiSetupReminderDays: number[];
  onboardingReminderDays: number[];
  // Onboarding Trigger Settings
  onboardingTriggerEnabled: boolean;
  onboardingTriggerLessonId: string | null;
  onboardingTriggerLessonName: string | null;
  onboardingTriggerCourseId: string | null;
  onboardingExistingMemberModule: number;
}

const DAYS = [
  { value: 0, label: "Sonntag" },
  { value: 1, label: "Montag" },
  { value: 2, label: "Dienstag" },
  { value: 3, label: "Mittwoch" },
  { value: 4, label: "Donnerstag" },
  { value: 5, label: "Freitag" },
  { value: 6, label: "Samstag" },
];

interface CronjobStatus {
  id: string;
  name: string;
  endpoint: string;
  schedule: string;
  status: "healthy" | "warning" | "error" | "unknown";
  statusMessage: string;
  lastExecution: string | null;
  lastSuccess: string | null;
  lastError: string | null;
  executionCount: number;
  successCount: number;
  errorCount: number;
}

export function SettingsForm() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cronjobStatuses, setCronjobStatuses] = useState<CronjobStatus[]>([]);
  const [loadingCronStatus, setLoadingCronStatus] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  // AI System Health
  interface HealthCheckResult {
    status: "OK" | "WARNING" | "ERROR" | "UNKNOWN";
    summary: string;
    issues: string[];
    lastCheck: string | null;
    triggered: boolean;
    data: unknown;
  }
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(null);
  const [loadingHealthCheck, setLoadingHealthCheck] = useState(false);
  const [runningHealthCheck, setRunningHealthCheck] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchCronjobStatus();
    fetchHealthCheck();
    // Refresh cronjob status every 30 seconds
    const interval = setInterval(fetchCronjobStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Fehler beim Laden der Einstellungen");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;

    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaved(true);
        toast.success("Einstellungen gespeichert");
        setTimeout(() => setSaved(false), 2000);
      } else {
        const error = await response.json();
        toast.error(error.error || "Fehler beim Speichern");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Fehler beim Speichern der Einstellungen");
    } finally {
      setSaving(false);
    }
  }

  async function fetchCronjobStatus() {
    setLoadingCronStatus(true);
    try {
      const response = await fetch("/api/cron/status");
      if (response.ok) {
        const data = await response.json();
        setCronjobStatuses(data.cronjobs || []);
      }
    } catch (error) {
      console.error("Error fetching cronjob status:", error);
    } finally {
      setLoadingCronStatus(false);
    }
  }

  async function fetchHealthCheck() {
    setLoadingHealthCheck(true);
    try {
      const response = await fetch("/api/settings/system-health");
      if (response.ok) {
        const data = await response.json();
        setHealthCheck(data);
      }
    } catch (error) {
      console.error("Error fetching health check:", error);
    } finally {
      setLoadingHealthCheck(false);
    }
  }

  async function runHealthCheck() {
    setRunningHealthCheck(true);
    try {
      const response = await fetch("/api/settings/system-health", {
        method: "POST",
      });
      if (response.ok) {
        const result = await response.json();
        toast.success("Health-Check abgeschlossen");
        // Refresh the health check data
        await fetchHealthCheck();
      } else {
        const error = await response.json();
        toast.error(error.error || "Health-Check fehlgeschlagen");
      }
    } catch (error) {
      console.error("Error running health check:", error);
      toast.error("Health-Check konnte nicht ausgeführt werden");
    } finally {
      setRunningHealthCheck(false);
    }
  }

  function updateSetting<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  }

  async function sendKpiReminder(reminderType: 1 | 2) {
    setSendingReminder(true);
    try {
      // Uses session auth, no CRON_SECRET needed for admin users
      const response = await fetch(`/api/cron/kpi-reminder?force=true&reminderType=${reminderType}`, {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        toast.success(
          `Reminder ${reminderType} gesendet: ${data.results.emailsSent} Emails, ${data.results.whatsappSent} WhatsApp`,
          { description: `${data.results.total} Members ohne KPIs für die Woche` }
        );
      } else if (data.skipped) {
        toast.info(data.reason || "Reminder übersprungen");
      } else {
        toast.error(data.error || "Fehler beim Senden der Reminder");
      }
    } catch (error) {
      console.error("Error sending KPI reminder:", error);
      toast.error("Fehler beim Senden der Reminder");
    } finally {
      setSendingReminder(false);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  }

  function getStatusBadgeColor(status: string) {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  }

  function getHealthStatusColor(status: string) {
    switch (status) {
      case "OK":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200";
      case "WARNING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200";
      case "ERROR":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200";
    }
  }

  function getHealthStatusIcon(status: string) {
    switch (status) {
      case "OK":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "WARNING":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "ERROR":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  }

  function formatRelativeTime(dateString: string | null) {
    if (!dateString) return "Nie";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Gerade eben";
    if (diffMins < 60) return `vor ${diffMins} Min`;
    if (diffHours < 24) return `vor ${diffHours} Std`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? "en" : ""}`;
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Einstellungen konnten nicht geladen werden.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Button (floating) */}
      <div className="flex justify-end sticky top-4 z-10">
        <Button onClick={saveSettings} disabled={saving} className="shadow-lg">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4 mr-2" />
          ) : null}
          {saved ? "Gespeichert" : "Alle Änderungen speichern"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ruhezeiten (Quiet Hours)
            </CardTitle>
            <CardDescription>
              Keine WhatsApp-Nachrichten während dieser Zeit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center">
                Ruhezeiten aktiviert
                <DefinedTooltip term="quietHours" />
              </Label>
              <Switch
                checked={settings.quietHoursEnabled}
                onCheckedChange={(v) => updateSetting("quietHoursEnabled", v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Beginn</Label>
                <Select
                  value={String(settings.quietHoursStart)}
                  onValueChange={(v) => updateSetting("quietHoursStart", parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {String(i).padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ende</Label>
                <Select
                  value={String(settings.quietHoursEnd)}
                  onValueChange={(v) => updateSetting("quietHoursEnd", parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {String(i).padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Standardmäßig: 21:00 - 08:00
            </p>
          </CardContent>
        </Card>

        {/* KPI Reminder Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              KPI-Erinnerungen
            </CardTitle>
            <CardDescription>
              Wann werden Mitglieder an KPI-Abgabe erinnert?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Erinnerungen aktiviert</Label>
              <Switch
                checked={settings.kpiReminderEnabled}
                onCheckedChange={(v) => updateSetting("kpiReminderEnabled", v)}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Erste Erinnerung</Label>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={String(settings.kpiReminderDay1)}
                  onValueChange={(v) => updateSetting("kpiReminderDay1", parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  value={settings.kpiReminderTime1}
                  onChange={(e) => updateSetting("kpiReminderTime1", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Zweite Erinnerung</Label>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={String(settings.kpiReminderDay2)}
                  onValueChange={(v) => updateSetting("kpiReminderDay2", parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  value={settings.kpiReminderTime2}
                  onChange={(e) => updateSetting("kpiReminderTime2", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Kanäle</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.kpiReminderChannels.includes("EMAIL")}
                    onChange={(e) => {
                      const channels = e.target.checked
                        ? [...settings.kpiReminderChannels, "EMAIL"]
                        : settings.kpiReminderChannels.filter((c) => c !== "EMAIL");
                      updateSetting("kpiReminderChannels", channels);
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">E-Mail</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.kpiReminderChannels.includes("WHATSAPP")}
                    onChange={(e) => {
                      const channels = e.target.checked
                        ? [...settings.kpiReminderChannels, "WHATSAPP"]
                        : settings.kpiReminderChannels.filter((c) => c !== "WHATSAPP");
                      updateSetting("kpiReminderChannels", channels);
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">WhatsApp</span>
                </label>
              </div>
            </div>

            {/* Manual Trigger */}
            <div className="flex flex-col gap-3 pt-4 border-t">
              <div>
                <Label className="text-sm font-medium">Manueller Versand</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Reminder jetzt sofort an alle Members ohne KPIs für diese Woche senden
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sendKpiReminder(1)}
                  disabled={sendingReminder}
                >
                  {sendingReminder ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  Reminder 1 (Freitag)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sendKpiReminder(2)}
                  disabled={sendingReminder}
                >
                  {sendingReminder ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mr-2" />
                  )}
                  Reminder 2 (Deadline)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Tracking Window */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Tracking-Fenster
            </CardTitle>
            <CardDescription>
              Wann ist das KPI-Formular geöffnet?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Fenster öffnet</Label>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={String(settings.kpiTrackingWindowOpenDay ?? 5)}
                  onValueChange={(v) => updateSetting("kpiTrackingWindowOpenDay", parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  value={settings.kpiTrackingWindowOpenTime ?? "12:00"}
                  onChange={(e) => updateSetting("kpiTrackingWindowOpenTime", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Fenster schließt</Label>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={String(settings.kpiTrackingWindowCloseDay ?? 1)}
                  onValueChange={(v) => updateSetting("kpiTrackingWindowCloseDay", parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  value={settings.kpiTrackingWindowCloseTime ?? "20:00"}
                  onChange={(e) => updateSetting("kpiTrackingWindowCloseTime", e.target.value)}
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-sm">
              <p className="font-medium mb-1">Zeitfenster-Logik:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Freitag 12:00:</strong> Formular öffnet für die laufende Woche</li>
                <li><strong>Freitag 19:00:</strong> 1. Erinnerung gesendet</li>
                <li><strong>Montag 08:00:</strong> 2. Erinnerung (Deadline-Warnung)</li>
                <li><strong>Montag 20:00:</strong> Formular schließt - nicht getrackt = raus</li>
                <li><strong>Di-Fr 12:00:</strong> Formular gesperrt</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* AI Feedback Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" />
              KI-Feedback
            </CardTitle>
            <CardDescription>
              Automatisches Feedback nach KPI-Einreichung
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>KI-Feedback aktiviert</Label>
              <Switch
                checked={settings.aiFeedbackEnabled}
                onCheckedChange={(v) => updateSetting("aiFeedbackEnabled", v)}
              />
            </div>

            <div className="space-y-2">
              <Label>Verzögerung (Minuten)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Minimum</Label>
                  <Input
                    type="number"
                    min="0"
                    max="1440"
                    value={settings.aiFeedbackDelayMin}
                    onChange={(e) => updateSetting("aiFeedbackDelayMin", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Maximum</Label>
                  <Input
                    type="number"
                    min="0"
                    max="1440"
                    value={settings.aiFeedbackDelayMax}
                    onChange={(e) => updateSetting("aiFeedbackDelayMax", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Zufälliger Versand zwischen min. und max. Minuten nach KPI-Einreichung.
                <br />
                Beispiel: 60-120 = zufällig zwischen 1-2 Stunden
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Feedback senden via</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.aiFeedbackChannels.includes("WHATSAPP")}
                    onChange={(e) => {
                      const channels = e.target.checked
                        ? [...settings.aiFeedbackChannels, "WHATSAPP"]
                        : settings.aiFeedbackChannels.filter((c) => c !== "WHATSAPP");
                      updateSetting("aiFeedbackChannels", channels);
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">WhatsApp</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.aiFeedbackChannels.includes("EMAIL")}
                    onChange={(e) => {
                      const channels = e.target.checked
                        ? [...settings.aiFeedbackChannels, "EMAIL"]
                        : settings.aiFeedbackChannels.filter((c) => c !== "EMAIL");
                      updateSetting("aiFeedbackChannels", channels);
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">E-Mail</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Automations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Geplante Automationen
            </CardTitle>
            <CardDescription>
              Wöchentliche Checks (Churn, Danger Zone, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Automationen aktiviert</Label>
              <Switch
                checked={settings.automationsEnabled}
                onCheckedChange={(v) => updateSetting("automationsEnabled", v)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tag</Label>
                <Select
                  value={String(settings.automationsDay)}
                  onValueChange={(v) => updateSetting("automationsDay", parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Uhrzeit</Label>
                <Input
                  type="time"
                  value={settings.automationsTime}
                  onChange={(e) => updateSetting("automationsTime", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Tracking Trigger Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              KPI-Tracking Aktivierung
            </CardTitle>
            <CardDescription>
              Wann wird KPI-Tracking automatisch aktiviert?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>LearninSuite Integration</Label>
              <Select
                value={settings.kpiTriggerSource || "manual"}
                onValueChange={(v) => updateSetting("kpiTriggerSource", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Nur manuell</SelectItem>
                  <SelectItem value="learningsuite_api">Nur LearninSuite API</SelectItem>
                  <SelectItem value="both">Beide (manuell + API)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Wenn "LearninSuite API" aktiviert ist, wird KPI-Tracking automatisch aktiviert,
                sobald ein Member das konfigurierte Modul erreicht.
              </p>
            </div>

            {settings.kpiTriggerSource !== "manual" && (
              <div className="space-y-2">
                <Label className="flex items-center">
                  Ab Modul aktivieren
                  <DefinedTooltip term="kpiTriggerModule" />
                </Label>
                <Select
                  value={String(settings.kpiTriggerModule || 2)}
                  onValueChange={(v) => updateSetting("kpiTriggerModule", parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((mod) => (
                      <SelectItem key={mod} value={String(mod)}>
                        Modul {mod}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  KPI-Tracking wird automatisch aktiviert, wenn ein Member dieses Modul oder höher erreicht.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Onboarding Reminder-Tage</Label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 7, 10, 14].map((day) => {
                  const isSelected = (settings.onboardingReminderDays || [1, 3, 7]).includes(day);
                  return (
                    <Button
                      key={day}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const currentDays = settings.onboardingReminderDays || [1, 3, 7];
                        const newDays = isSelected
                          ? currentDays.filter((d) => d !== day)
                          : [...currentDays, day].sort((a, b) => a - b);
                        updateSetting("onboardingReminderDays", newDays);
                      }}
                    >
                      Tag {day}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                An welchen Tagen nach Hinzufügen sollen Onboarding-Reminder gesendet werden?
                Aktuell: {settings.onboardingReminderDays?.join(", ") || "1, 3, 7"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>KPI-Setup Reminder-Tage</Label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 7, 10, 14].map((day) => {
                  const isSelected = (settings.kpiSetupReminderDays || [1, 3, 7]).includes(day);
                  return (
                    <Button
                      key={day}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const currentDays = settings.kpiSetupReminderDays || [1, 3, 7];
                        const newDays = isSelected
                          ? currentDays.filter((d) => d !== day)
                          : [...currentDays, day].sort((a, b) => a - b);
                        updateSetting("kpiSetupReminderDays", newDays);
                      }}
                    >
                      Tag {day}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                An welchen Tagen nach KPI-Aktivierung sollen KPI-Setup-Reminder gesendet werden?
                Aktuell: {settings.kpiSetupReminderDays?.join(", ") || "1, 3, 7"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Trigger Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Onboarding-Trigger (LearningSuite)
            </CardTitle>
            <CardDescription>
              Verzögertes Onboarding basierend auf Kurs-Fortschritt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>LearningSuite Onboarding-Trigger</Label>
                <p className="text-sm text-muted-foreground">
                  Onboarding erst nach bestimmter Lesson senden
                </p>
              </div>
              <Switch
                checked={settings.onboardingTriggerEnabled || false}
                onCheckedChange={(v) => updateSetting("onboardingTriggerEnabled", v)}
              />
            </div>

            {settings.onboardingTriggerEnabled && (
              <>
                <div className="space-y-2">
                  <Label>Trigger-Lesson ID</Label>
                  <Input
                    type="text"
                    placeholder="z.B. lesson-xyz-123"
                    value={settings.onboardingTriggerLessonId || ""}
                    onChange={(e) => updateSetting("onboardingTriggerLessonId", e.target.value || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Die LearningSuite Lesson-ID, die das Onboarding auslöst (z.B. Willkommensvideo)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Trigger-Lesson Name (optional)</Label>
                  <Input
                    type="text"
                    placeholder="z.B. Willkommensvideo"
                    value={settings.onboardingTriggerLessonName || ""}
                    onChange={(e) => updateSetting("onboardingTriggerLessonName", e.target.value || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Zur Anzeige im Admin-Bereich
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Kurs-ID (optional)</Label>
                  <Input
                    type="text"
                    placeholder="z.B. course-abc-456"
                    value={settings.onboardingTriggerCourseId || ""}
                    onChange={(e) => updateSetting("onboardingTriggerCourseId", e.target.value || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Wenn leer, wird jeder Kurs akzeptiert
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Bestandskunden ab Modul</Label>
                  <Select
                    value={String(settings.onboardingExistingMemberModule || 2)}
                    onValueChange={(v) => updateSetting("onboardingExistingMemberModule", parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((mod) => (
                        <SelectItem key={mod} value={String(mod)}>
                          Ab Modul {mod}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Members die dieses Modul oder höher haben, erhalten Onboarding sofort (Bestandskunden).
                    Neue Members warten auf die Trigger-Lesson.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-sm">
                  <p className="font-medium mb-1">So funktioniert es:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li><strong>Neue Member:</strong> Warten auf Trigger-Lesson → dann Onboarding</li>
                    <li><strong>Bestandskunden (ab Modul {settings.onboardingExistingMemberModule || 2}):</strong> Onboarding sofort</li>
                    <li>Webhook URL: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">/api/webhooks/learningsuite</code></li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Churn Risk Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Inaktivitäts-Schwellwerte
            </CardTitle>
            <CardDescription>
              Ab wann werden Mitglieder als Risiko markiert?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center">
                Churn-Risiko (Wochen ohne KPI)
                <DefinedTooltip term="churnRisk" />
              </Label>
              <Input
                type="number"
                min="1"
                max="12"
                value={settings.churnRiskWeeks}
                onChange={(e) => updateSetting("churnRiskWeeks", parseInt(e.target.value) || 2)}
              />
              <p className="text-xs text-muted-foreground">
                Standardmäßig: 2 Wochen
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center">
                Danger Zone (Wochen ohne KPI)
                <DefinedTooltip term="dangerZone" />
              </Label>
              <Input
                type="number"
                min="1"
                max="24"
                value={settings.dangerZoneWeeks}
                onChange={(e) => updateSetting("dangerZoneWeeks", parseInt(e.target.value) || 4)}
              />
              <p className="text-xs text-muted-foreground">
                Standardmäßig: 4 Wochen
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upsell Triggers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Upsell-Trigger
            </CardTitle>
            <CardDescription>
              Wann werden Mitglieder als Upsell-Kandidaten markiert?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center">
                Monatsumsatz-Schwelle (EUR)
                <DefinedTooltip term="upsellCandidate" />
              </Label>
              <Input
                type="number"
                min="0"
                step="1000"
                value={settings.upsellRevenueThreshold}
                onChange={(e) => updateSetting("upsellRevenueThreshold", parseFloat(e.target.value) || 20000)}
              />
              <p className="text-xs text-muted-foreground">
                Mindest-Monatsumsatz für Upsell-Signal (Summe aus 4 Wochen)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Aufeinanderfolgende Wochen</Label>
              <Input
                type="number"
                min="4"
                max="52"
                value={settings.upsellConsecutiveWeeks}
                onChange={(e) => updateSetting("upsellConsecutiveWeeks", parseInt(e.target.value) || 12)}
              />
              <p className="text-xs text-muted-foreground">
                Wie viele Wochen in Folge? (z.B. 12 = 3 Monate, 24 = 6 Monate)
                <br />
                Jeder 4-Wochen-Block muss die Monatsumsatz-Schwelle erreichen.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Coach Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Coach-Benachrichtigungen
            </CardTitle>
            <CardDescription>
              E-Mail-Benachrichtigungen für Coaches
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Task-Benachrichtigungen</Label>
                <p className="text-sm text-muted-foreground">
                  E-Mail wenn neue Task erstellt wird
                </p>
              </div>
              <Switch
                checked={settings.coachEmailNotifications}
                onCheckedChange={(v) => updateSetting("coachEmailNotifications", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Admin Daily Digest</Label>
                <p className="text-sm text-muted-foreground">
                  Tägliche Zusammenfassung für Admins
                </p>
              </div>
              <Switch
                checked={settings.adminEmailDigest}
                onCheckedChange={(v) => updateSetting("adminEmailDigest", v)}
              />
            </div>

            {settings.adminEmailDigest && (
              <div className="space-y-2">
                <Label>Digest-Uhrzeit</Label>
                <Input
                  type="time"
                  value={settings.adminEmailDigestTime}
                  onChange={(e) => updateSetting("adminEmailDigestTime", e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* KI-Systemüberwacher */}
        <Card className="lg:col-span-2 border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  KI-Systemüberwacher
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                </CardTitle>
                <CardDescription>
                  GPT-5.2 analysiert täglich den Systemzustand
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={runHealthCheck}
                disabled={runningHealthCheck}
              >
                {runningHealthCheck ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                {runningHealthCheck ? "Prüfe..." : "Jetzt prüfen"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingHealthCheck && !healthCheck ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !healthCheck || healthCheck.status === "UNKNOWN" ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Noch kein Health-Check durchgeführt</p>
                <p className="text-sm mt-1">Klicke auf "Jetzt prüfen" um die erste Analyse zu starten.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status Badge */}
                <div className={`p-4 rounded-lg border ${getHealthStatusColor(healthCheck.status)}`}>
                  <div className="flex items-center gap-3">
                    {getHealthStatusIcon(healthCheck.status)}
                    <div>
                      <p className="font-semibold">
                        System-Status: {healthCheck.status === "OK" ? "Alles OK" : healthCheck.status === "WARNING" ? "Warnung" : healthCheck.status === "ERROR" ? "Fehler erkannt" : "Unbekannt"}
                      </p>
                      {healthCheck.lastCheck && (
                        <p className="text-xs opacity-75 mt-0.5">
                          Letzte Prüfung: {formatRelativeTime(healthCheck.lastCheck)} ({new Date(healthCheck.lastCheck).toLocaleString("de-DE")})
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    KI-Analyse
                  </Label>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <p className="text-sm whitespace-pre-wrap">{healthCheck.summary}</p>
                  </div>
                </div>

                {/* Issues List */}
                {healthCheck.issues && healthCheck.issues.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2 text-yellow-600">
                      <AlertTriangle className="h-4 w-4" />
                      Erkannte Probleme ({healthCheck.issues.length})
                    </Label>
                    <ul className="space-y-1">
                      {healthCheck.issues.map((issue, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cronjob Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Cronjob Status
                </CardTitle>
                <CardDescription>
                  Überwachung der automatisierten Aufgaben
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCronjobStatus}
                disabled={loadingCronStatus}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingCronStatus ? "animate-spin" : ""}`} />
                Aktualisieren
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCronStatus && cronjobStatuses.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : cronjobStatuses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine Cronjob-Statusdaten verfügbar
              </div>
            ) : (
              <div className="space-y-3">
                {cronjobStatuses.map((cronjob) => (
                  <div
                    key={cronjob.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{cronjob.name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(cronjob.status)}`}>
                            {cronjob.status === "healthy" ? "Aktiv" : cronjob.status === "warning" ? "Warnung" : cronjob.status === "error" ? "Fehler" : "Unbekannt"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {cronjob.schedule}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cronjob.statusMessage}
                        </p>
                      </div>
                      {getStatusIcon(cronjob.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t text-xs">
                      <div>
                        <p className="text-muted-foreground mb-1">Letzte Ausführung</p>
                        <p className="font-medium">
                          {formatRelativeTime(cronjob.lastExecution)}
                        </p>
                        {cronjob.lastExecution && (
                          <p className="text-muted-foreground text-[10px] mt-0.5">
                            {new Date(cronjob.lastExecution).toLocaleString("de-DE")}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Statistik</p>
                        <div className="flex gap-3">
                          <div>
                            <p className="font-medium text-green-600">{cronjob.successCount}</p>
                            <p className="text-[10px] text-muted-foreground">Erfolg</p>
                          </div>
                          {cronjob.errorCount > 0 && (
                            <div>
                              <p className="font-medium text-red-600">{cronjob.errorCount}</p>
                              <p className="text-[10px] text-muted-foreground">Fehler</p>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{cronjob.executionCount}</p>
                            <p className="text-[10px] text-muted-foreground">Gesamt</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
