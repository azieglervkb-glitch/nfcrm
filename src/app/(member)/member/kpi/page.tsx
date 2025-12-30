"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  Save,
  Loader2,
  TrendingUp,
  Calendar,
  CheckCircle,
} from "lucide-react";

interface KPIEntry {
  id: string;
  weekStart: string;
  kontakteGenerated: number | null;
  kontakteTarget: number;
  termineClosed: number | null;
  termineTarget: number;
  abschluesseCount: number | null;
  abschluesseTarget: number;
  umsatz: number | null;
  submitted: boolean;
}

interface WeekOption {
  weekStart: string;
  label: string;
  weekNumber: number;
  isDefault: boolean;
  isPreviousWeek?: boolean; // Indicates if this is the previous week (not current)
}

interface KPIData {
  currentWeek: KPIEntry | null;
  history: KPIEntry[];
  targets: {
    kontakte: number;
    termine: number;
    abschluesse: number;
  };
  availableWeeks?: WeekOption[];
  selectedWeekStart?: string;
}

export default function MemberKPIPage() {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [formData, setFormData] = useState({
    kontakteGenerated: "",
    termineClosed: "",
    abschluesseCount: "",
    umsatz: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchKPIData();
  }, []);

  // Refetch when week selection changes
  useEffect(() => {
    if (selectedWeek && data?.selectedWeekStart !== selectedWeek) {
      fetchKPIData(selectedWeek);
    }
  }, [selectedWeek]);

  const fetchKPIData = async (weekStart?: string) => {
    try {
      setLoading(true);
      const url = weekStart
        ? `/api/member/kpi?weekStart=${encodeURIComponent(weekStart)}`
        : "/api/member/kpi";
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        setData(result);
        // Set default selected week on first load
        if (!selectedWeek && result.selectedWeekStart) {
          setSelectedWeek(result.selectedWeekStart);
        }
        if (result.currentWeek) {
          setFormData({
            kontakteGenerated: result.currentWeek.kontakteGenerated?.toString() || "",
            termineClosed: result.currentWeek.termineClosed?.toString() || "",
            abschluesseCount: result.currentWeek.abschluesseCount?.toString() || "",
            umsatz: result.currentWeek.umsatz?.toString() || "",
          });
        } else {
          // Reset form if no data for this week
          setFormData({
            kontakteGenerated: "",
            termineClosed: "",
            abschluesseCount: "",
            umsatz: "",
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch KPI data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      const response = await fetch("/api/member/kpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: selectedWeek,
          kontakteGenerated: formData.kontakteGenerated ? parseInt(formData.kontakteGenerated) : null,
          termineClosed: formData.termineClosed ? parseInt(formData.termineClosed) : null,
          abschluesseCount: formData.abschluesseCount ? parseInt(formData.abschluesseCount) : null,
          umsatz: formData.umsatz ? parseFloat(formData.umsatz) : null,
        }),
      });

      if (response.ok) {
        toast({
          title: "Gespeichert",
          description: "KPIs wurden erfolgreich gespeichert",
        });
        fetchKPIData(selectedWeek);
      } else {
        const error = await response.json();
        toast({
          title: "Fehler",
          description: error.message || "KPIs konnten nicht gespeichert werden",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to save KPIs:", error);
      toast({
        title: "Fehler",
        description: "KPIs konnten nicht gespeichert werden",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getWeekLabel = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
    });
  };

  const calculateProgress = (value: number | null, target: number) => {
    if (!value || target === 0) return 0;
    return Math.round((value / target) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KPI Tracking</h1>
        <p className="text-gray-600">Trage deine wöchentlichen Leistungszahlen ein</p>
      </div>

      {/* Week Selector */}
      {data?.availableWeeks && data.availableWeeks.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Label className="text-blue-800 font-medium whitespace-nowrap">
                <Calendar className="h-4 w-4 inline mr-2" />
                Woche auswählen:
              </Label>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-full sm:w-[320px] bg-white">
                  <SelectValue placeholder="Woche auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {data.availableWeeks.map((week) => (
                    <SelectItem key={week.weekStart} value={week.weekStart}>
                      {week.label}
                      {week.isPreviousWeek && " (Vorwoche)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Week Entry */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-red-600" />
                KPIs eintragen
              </CardTitle>
              <CardDescription>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4" />
                  {data?.availableWeeks?.find(w => w.weekStart === selectedWeek)?.label || "Woche auswählen"}
                </div>
              </CardDescription>
            </div>
            {data?.currentWeek?.submitted && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Eingereicht
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="kontakte">
                  Kontakte generiert
                  <span className="text-gray-500 ml-2">
                    (Target: {data?.targets.kontakte || 0})
                  </span>
                </Label>
                <Input
                  id="kontakte"
                  type="number"
                  min="0"
                  value={formData.kontakteGenerated}
                  onChange={(e) =>
                    setFormData({ ...formData, kontakteGenerated: e.target.value })
                  }
                  placeholder="0"
                />
                {formData.kontakteGenerated && (
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        calculateProgress(parseInt(formData.kontakteGenerated), data?.targets.kontakte || 1) >= 100
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          calculateProgress(parseInt(formData.kontakteGenerated), data?.targets.kontakte || 1),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="termine">
                  Termine abgeschlossen
                  <span className="text-gray-500 ml-2">
                    (Target: {data?.targets.termine || 0})
                  </span>
                </Label>
                <Input
                  id="termine"
                  type="number"
                  min="0"
                  value={formData.termineClosed}
                  onChange={(e) =>
                    setFormData({ ...formData, termineClosed: e.target.value })
                  }
                  placeholder="0"
                />
                {formData.termineClosed && (
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        calculateProgress(parseInt(formData.termineClosed), data?.targets.termine || 1) >= 100
                          ? "bg-green-500"
                          : "bg-purple-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          calculateProgress(parseInt(formData.termineClosed), data?.targets.termine || 1),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="abschluesse">
                  Abschlüsse
                  <span className="text-gray-500 ml-2">
                    (Target: {data?.targets.abschluesse || 0})
                  </span>
                </Label>
                <Input
                  id="abschluesse"
                  type="number"
                  min="0"
                  value={formData.abschluesseCount}
                  onChange={(e) =>
                    setFormData({ ...formData, abschluesseCount: e.target.value })
                  }
                  placeholder="0"
                />
                {formData.abschluesseCount && (
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        calculateProgress(parseInt(formData.abschluesseCount), data?.targets.abschluesse || 1) >= 100
                          ? "bg-green-500"
                          : "bg-orange-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          calculateProgress(parseInt(formData.abschluesseCount), data?.targets.abschluesse || 1),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="umsatz">Umsatz (€)</Label>
                <Input
                  id="umsatz"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.umsatz}
                  onChange={(e) =>
                    setFormData({ ...formData, umsatz: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save KPIs
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* KPI History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            KPI History
          </CardTitle>
          <CardDescription>Your past weekly performance</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.history && data.history.length > 0 ? (
            <div className="space-y-4">
              {data.history.map((entry) => {
                const kontakteProgress = calculateProgress(
                  entry.kontakteGenerated,
                  entry.kontakteTarget
                );
                const termineProgress = calculateProgress(
                  entry.termineClosed,
                  entry.termineTarget
                );
                const abschluesseProgress = calculateProgress(
                  entry.abschluesseCount,
                  entry.abschluesseTarget
                );
                const avgProgress = Math.round(
                  (kontakteProgress + termineProgress + abschluesseProgress) / 3
                );

                return (
                  <div
                    key={entry.id}
                    className="p-4 bg-gray-50 rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          Week of {getWeekLabel(entry.weekStart)}
                        </span>
                      </div>
                      <Badge
                        className={
                          avgProgress >= 80
                            ? "bg-green-100 text-green-800"
                            : avgProgress >= 50
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {avgProgress}% avg
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Kontakte</p>
                        <p className="font-medium">
                          {entry.kontakteGenerated || 0} / {entry.kontakteTarget}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Termine</p>
                        <p className="font-medium">
                          {entry.termineClosed || 0} / {entry.termineTarget}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Abschlüsse</p>
                        <p className="font-medium">
                          {entry.abschluesseCount || 0} / {entry.abschluesseTarget}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No KPI history yet. Start tracking to see your progress!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
