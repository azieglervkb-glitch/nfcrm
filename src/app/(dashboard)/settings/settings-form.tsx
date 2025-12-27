"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Mail, MessageSquare, Brain, Bell, Clock, AlertTriangle, TrendingUp, Loader2, Check, Activity, CheckCircle2, XCircle, AlertCircle, RefreshCw, Bot, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
              <Label>Ruhezeiten aktiviert</Label>
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
              <Label>Churn-Risiko (Wochen ohne KPI)</Label>
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
              <Label>Danger Zone (Wochen ohne KPI)</Label>
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
              <Label>Monatsumsatz-Schwelle (EUR)</Label>
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
