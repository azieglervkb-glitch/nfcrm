"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  BarChart3,
  Target,
  User,
  Home,
  TrendingUp,
  Loader2,
  Trophy,
  Calendar,
  Pencil,
  Save,
  Settings2,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MemberGoals {
  vorname: string;
  hauptzielEinSatz: string | null;
  umsatzSollWoche: number | null;
  umsatzSollMonat: number | null;
  kontakteSoll: number | null;
  entscheiderSoll: number | null;
  termineVereinbartSoll: number | null;
  termineStattgefundenSoll: number | null;
  termineAbschlussSoll: number | null;
  einheitenSoll: number | null;
  empfehlungenSoll: number | null;
  konvertierungTerminSoll: number | null;
  abschlussquoteSoll: number | null;
  trackKontakte: boolean;
  trackTermine: boolean;
  trackAbschluesse: boolean;
  trackEinheiten: boolean;
  trackEmpfehlungen: boolean;
  trackEntscheider: boolean;
  trackKonvertierung: boolean;
  trackAbschlussquote: boolean;
}

interface GoalHistoryEntry {
  id: string;
  changedAt: string;
  source: string | null;
  goals: {
    hauptzielEinSatz: string | null;
    umsatzSollWoche: number | null;
    umsatzSollMonat: number | null;
    kontakteSoll: number | null;
    entscheiderSoll: number | null;
    termineVereinbartSoll: number | null;
    termineStattgefundenSoll: number | null;
    termineAbschlussSoll: number | null;
    einheitenSoll: number | null;
    empfehlungenSoll: number | null;
    konvertierungTerminSoll: number | null;
    abschlussquoteSoll: number | null;
  };
  tracking: {
    trackKontakte: boolean;
    trackTermine: boolean;
    trackAbschluesse: boolean;
    trackEinheiten: boolean;
    trackEmpfehlungen: boolean;
    trackEntscheider: boolean;
    trackKonvertierung: boolean;
    trackAbschlussquote: boolean;
  };
}

export default function MemberGoalsPage() {
  const params = useParams();
  const memberId = params.memberId as string;
  const { toast } = useToast();

  const [memberGoals, setMemberGoals] = useState<MemberGoals | null>(null);
  const [goalHistory, setGoalHistory] = useState<GoalHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    hauptzielEinSatz: "",
    umsatzSollWoche: "",
    umsatzSollMonat: "",
    kontakteSoll: "",
    entscheiderSoll: "",
    termineVereinbartSoll: "",
    termineStattgefundenSoll: "",
    termineAbschlussSoll: "",
    einheitenSoll: "",
    empfehlungenSoll: "",
    konvertierungTerminSoll: "",
    abschlussquoteSoll: "",
    // Track toggles
    trackKontakte: true,
    trackTermine: true,
    trackAbschluesse: true,
    trackEinheiten: false,
    trackEmpfehlungen: false,
    trackEntscheider: false,
    trackKonvertierung: false,
    trackAbschlussquote: false,
  });

  useEffect(() => {
    if (memberId) {
      fetchMemberGoals();
      fetchGoalHistory();
    }
  }, [memberId]);

  const fetchMemberGoals = async () => {
    try {
      const response = await fetch(`/api/member/goals?memberId=${memberId}`);
      if (response.ok) {
        const data = await response.json();
        setMemberGoals(data);
        // Initialize edit form with current values
        setEditForm({
          hauptzielEinSatz: data.hauptzielEinSatz || "",
          umsatzSollWoche: data.umsatzSollWoche?.toString() || "",
          umsatzSollMonat: data.umsatzSollMonat?.toString() || "",
          kontakteSoll: data.kontakteSoll?.toString() || "",
          entscheiderSoll: data.entscheiderSoll?.toString() || "",
          termineVereinbartSoll: data.termineVereinbartSoll?.toString() || "",
          termineStattgefundenSoll: data.termineStattgefundenSoll?.toString() || "",
          termineAbschlussSoll: data.termineAbschlussSoll?.toString() || "",
          einheitenSoll: data.einheitenSoll?.toString() || "",
          empfehlungenSoll: data.empfehlungenSoll?.toString() || "",
          konvertierungTerminSoll: data.konvertierungTerminSoll?.toString() || "",
          abschlussquoteSoll: data.abschlussquoteSoll?.toString() || "",
          // Track toggles
          trackKontakte: data.trackKontakte ?? true,
          trackTermine: data.trackTermine ?? true,
          trackAbschluesse: data.trackAbschluesse ?? true,
          trackEinheiten: data.trackEinheiten ?? false,
          trackEmpfehlungen: data.trackEmpfehlungen ?? false,
          trackEntscheider: data.trackEntscheider ?? false,
          trackKonvertierung: data.trackKonvertierung ?? false,
          trackAbschlussquote: data.trackAbschlussquote ?? false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGoalHistory = async () => {
    try {
      const response = await fetch(`/api/member/goals/history?memberId=${memberId}`);
      if (response.ok) {
        const data = await response.json();
        setGoalHistory(data.history || []);
      }
    } catch (error) {
      console.error("Failed to fetch goal history:", error);
    }
  };

  const handleSaveGoals = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/member/goals`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          hauptzielEinSatz: editForm.hauptzielEinSatz || null,
          umsatzSollWoche: editForm.umsatzSollWoche ? parseFloat(editForm.umsatzSollWoche) : null,
          umsatzSollMonat: editForm.umsatzSollMonat ? parseFloat(editForm.umsatzSollMonat) : null,
          kontakteSoll: editForm.kontakteSoll ? parseInt(editForm.kontakteSoll) : null,
          entscheiderSoll: editForm.entscheiderSoll ? parseInt(editForm.entscheiderSoll) : null,
          termineVereinbartSoll: editForm.termineVereinbartSoll ? parseInt(editForm.termineVereinbartSoll) : null,
          termineStattgefundenSoll: editForm.termineStattgefundenSoll ? parseInt(editForm.termineStattgefundenSoll) : null,
          termineAbschlussSoll: editForm.termineAbschlussSoll ? parseInt(editForm.termineAbschlussSoll) : null,
          einheitenSoll: editForm.einheitenSoll ? parseInt(editForm.einheitenSoll) : null,
          empfehlungenSoll: editForm.empfehlungenSoll ? parseInt(editForm.empfehlungenSoll) : null,
          konvertierungTerminSoll: editForm.konvertierungTerminSoll ? parseFloat(editForm.konvertierungTerminSoll) : null,
          abschlussquoteSoll: editForm.abschlussquoteSoll ? parseFloat(editForm.abschlussquoteSoll) : null,
          // Track toggles
          trackKontakte: editForm.trackKontakte,
          trackTermine: editForm.trackTermine,
          trackAbschluesse: editForm.trackAbschluesse,
          trackEinheiten: editForm.trackEinheiten,
          trackEmpfehlungen: editForm.trackEmpfehlungen,
          trackEntscheider: editForm.trackEntscheider,
          trackKonvertierung: editForm.trackKonvertierung,
          trackAbschlussquote: editForm.trackAbschlussquote,
        }),
      });

      if (response.ok) {
        toast({
          title: "Ziele gespeichert!",
          description: "Deine Ziele wurden erfolgreich aktualisiert.",
        });
        setEditDialogOpen(false);
        fetchMemberGoals(); // Refresh data
        fetchGoalHistory(); // Refresh history
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Beim Speichern ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return Number(value).toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    });
  };

  const navItems = [
    { href: `/member/${memberId}`, icon: Home, label: "Dashboard" },
    { href: `/member/${memberId}/kpi`, icon: BarChart3, label: "KPI Tracking" },
    { href: `/member/${memberId}/ziele`, icon: Target, label: "Meine Ziele" },
    { href: `/member/${memberId}/profil`, icon: User, label: "Profil" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <img src="/nf-logo.png" alt="NF Mentoring" className="h-8 w-auto" />
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      item.href.includes("/ziele")
                        ? "text-red-600 bg-red-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium ${
                item.href.includes("/ziele") ? "text-red-600" : "text-gray-600"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meine Ziele</h1>
              <p className="text-gray-600">Deine definierten Ziele und Wochenziele</p>
            </div>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Ziele anpassen
            </Button>
          </div>

          {/* Hauptziel */}
          {memberGoals?.hauptzielEinSatz && (
            <Card className="bg-gradient-to-br from-red-600 to-red-700 text-white">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-full">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">Mein Hauptziel</CardTitle>
                    <CardDescription className="text-red-100">
                      Das hast du dir vorgenommen
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">"{memberGoals.hauptzielEinSatz}"</p>
              </CardContent>
            </Card>
          )}

          {/* Umsatzziele */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Umsatzziele</CardTitle>
                  <CardDescription>Deine finanziellen Ziele</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500 mb-1">Wochenziel</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(memberGoals?.umsatzSollWoche || null)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500 mb-1">Monatsziel</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(memberGoals?.umsatzSollMonat || null)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aktivitätsziele */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Wöchentliche Aktivitätsziele</CardTitle>
                  <CardDescription>Deine KPI-Ziele pro Woche</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {memberGoals?.trackKontakte && memberGoals.kontakteSoll && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500 mb-1">Kontakte</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {memberGoals.kontakteSoll}
                    </p>
                  </div>
                )}
                {memberGoals?.trackTermine && memberGoals.termineVereinbartSoll && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500 mb-1">Termine</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {memberGoals.termineVereinbartSoll}
                    </p>
                  </div>
                )}
                {memberGoals?.trackAbschluesse && memberGoals.termineAbschlussSoll && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500 mb-1">Abschlüsse</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {memberGoals.termineAbschlussSoll}
                    </p>
                  </div>
                )}
                {memberGoals?.trackEinheiten && memberGoals.einheitenSoll && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500 mb-1">Einheiten</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {memberGoals.einheitenSoll}
                    </p>
                  </div>
                )}
                {memberGoals?.trackEmpfehlungen && memberGoals.empfehlungenSoll && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500 mb-1">Empfehlungen</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {memberGoals.empfehlungenSoll}
                    </p>
                  </div>
                )}
              </div>
              {!memberGoals?.kontakteSoll &&
               !memberGoals?.termineVereinbartSoll &&
               !memberGoals?.termineAbschlussSoll &&
               !memberGoals?.einheitenSoll &&
               !memberGoals?.empfehlungenSoll && (
                <p className="text-center text-gray-500 py-4">
                  Keine Aktivitätsziele definiert
                </p>
              )}
            </CardContent>
          </Card>

          {/* Goal History Section */}
          <Card>
            <CardHeader className="pb-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-lg">Zielverlauf</CardTitle>
                </div>
                {showHistory ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
              <CardDescription>
                Sieh dir an, wie sich deine Ziele entwickelt haben
              </CardDescription>
            </CardHeader>
            {showHistory && (
              <CardContent>
                {goalHistory.length > 0 ? (
                  <div className="space-y-4">
                    {goalHistory.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={`p-4 rounded-lg border ${
                          index === 0 ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-sm">
                              {new Date(entry.changedAt).toLocaleDateString("de-DE", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {index === 0 && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                              Aktuell
                            </span>
                          )}
                        </div>

                        {/* Goals summary */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                          {entry.goals.umsatzSollMonat && (
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-500 text-xs">Monatsumsatz</span>
                              <p className="font-semibold">
                                {Number(entry.goals.umsatzSollMonat).toLocaleString("de-DE", {
                                  style: "currency",
                                  currency: "EUR",
                                  minimumFractionDigits: 0,
                                })}
                              </p>
                            </div>
                          )}
                          {entry.tracking.trackKontakte && entry.goals.kontakteSoll && (
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-500 text-xs">Kontakte/Woche</span>
                              <p className="font-semibold">{entry.goals.kontakteSoll}</p>
                            </div>
                          )}
                          {entry.tracking.trackTermine && entry.goals.termineVereinbartSoll && (
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-500 text-xs">Termine/Woche</span>
                              <p className="font-semibold">{entry.goals.termineVereinbartSoll}</p>
                            </div>
                          )}
                          {entry.tracking.trackAbschluesse && entry.goals.termineAbschlussSoll && (
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-500 text-xs">Abschlüsse/Woche</span>
                              <p className="font-semibold">{entry.goals.termineAbschlussSoll}</p>
                            </div>
                          )}
                          {entry.tracking.trackEinheiten && entry.goals.einheitenSoll && (
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-500 text-xs">Einheiten/Woche</span>
                              <p className="font-semibold">{entry.goals.einheitenSoll}</p>
                            </div>
                          )}
                          {entry.tracking.trackEmpfehlungen && entry.goals.empfehlungenSoll && (
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-500 text-xs">Empfehlungen/Woche</span>
                              <p className="font-semibold">{entry.goals.empfehlungenSoll}</p>
                            </div>
                          )}
                          {entry.tracking.trackKonvertierung && entry.goals.konvertierungTerminSoll && (
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-500 text-xs">Konvertierung</span>
                              <p className="font-semibold">{entry.goals.konvertierungTerminSoll}%</p>
                            </div>
                          )}
                          {entry.tracking.trackAbschlussquote && entry.goals.abschlussquoteSoll && (
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-500 text-xs">Abschlussquote</span>
                              <p className="font-semibold">{entry.goals.abschlussquoteSoll}%</p>
                            </div>
                          )}
                        </div>

                        {/* Hauptziel if changed */}
                        {entry.goals.hauptzielEinSatz && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <span className="text-xs text-gray-500">Hauptziel:</span>
                            <p className="text-sm italic">&ldquo;{entry.goals.hauptzielEinSatz}&rdquo;</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <History className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>Noch keine Änderungen dokumentiert.</p>
                    <p className="text-sm">Zukünftige Änderungen werden hier angezeigt.</p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ziele anpassen</DialogTitle>
            <DialogDescription>
              Passe deine Ziele an deine aktuelle Situation an.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Hauptziel */}
            <div className="space-y-2">
              <Label htmlFor="hauptzielEinSatz">Mein Hauptziel</Label>
              <Input
                id="hauptzielEinSatz"
                placeholder="z.B. 30.000€ Monatsumsatz bis Ende des Jahres"
                value={editForm.hauptzielEinSatz}
                onChange={(e) => setEditForm({ ...editForm, hauptzielEinSatz: e.target.value })}
              />
            </div>

            {/* Umsatzziele */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-700">Umsatzziele</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="umsatzSollWoche">Wochenziel (€)</Label>
                  <Input
                    id="umsatzSollWoche"
                    type="number"
                    placeholder="z.B. 5000"
                    value={editForm.umsatzSollWoche}
                    onChange={(e) => setEditForm({ ...editForm, umsatzSollWoche: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="umsatzSollMonat">Monatsziel (€)</Label>
                  <Input
                    id="umsatzSollMonat"
                    type="number"
                    placeholder="z.B. 20000"
                    value={editForm.umsatzSollMonat}
                    onChange={(e) => setEditForm({ ...editForm, umsatzSollMonat: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* KPI Tracking Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-gray-500" />
                <h3 className="font-semibold text-sm text-gray-700">KPI Tracking aktivieren</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="trackKontakte" className="text-sm cursor-pointer">Kontakte</Label>
                  <Switch
                    id="trackKontakte"
                    checked={editForm.trackKontakte}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, trackKontakte: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="trackTermine" className="text-sm cursor-pointer">Termine</Label>
                  <Switch
                    id="trackTermine"
                    checked={editForm.trackTermine}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, trackTermine: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="trackAbschluesse" className="text-sm cursor-pointer">Abschlüsse</Label>
                  <Switch
                    id="trackAbschluesse"
                    checked={editForm.trackAbschluesse}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, trackAbschluesse: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="trackEinheiten" className="text-sm cursor-pointer">Einheiten</Label>
                  <Switch
                    id="trackEinheiten"
                    checked={editForm.trackEinheiten}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, trackEinheiten: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="trackEmpfehlungen" className="text-sm cursor-pointer">Empfehlungen</Label>
                  <Switch
                    id="trackEmpfehlungen"
                    checked={editForm.trackEmpfehlungen}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, trackEmpfehlungen: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="trackEntscheider" className="text-sm cursor-pointer">Entscheider</Label>
                  <Switch
                    id="trackEntscheider"
                    checked={editForm.trackEntscheider}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, trackEntscheider: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="trackKonvertierung" className="text-sm cursor-pointer">Konvertierung %</Label>
                  <Switch
                    id="trackKonvertierung"
                    checked={editForm.trackKonvertierung}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, trackKonvertierung: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="trackAbschlussquote" className="text-sm cursor-pointer">Abschlussquote %</Label>
                  <Switch
                    id="trackAbschlussquote"
                    checked={editForm.trackAbschlussquote}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, trackAbschlussquote: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Aktivitätsziele */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-700">Wöchentliche Aktivitätsziele</h3>
              <div className="grid grid-cols-2 gap-4">
                {editForm.trackKontakte && (
                  <div className="space-y-2">
                    <Label htmlFor="kontakteSoll">Kontakte</Label>
                    <Input
                      id="kontakteSoll"
                      type="number"
                      placeholder="z.B. 20"
                      value={editForm.kontakteSoll}
                      onChange={(e) => setEditForm({ ...editForm, kontakteSoll: e.target.value })}
                    />
                  </div>
                )}
                {editForm.trackEntscheider && (
                  <div className="space-y-2">
                    <Label htmlFor="entscheiderSoll">Entscheider</Label>
                    <Input
                      id="entscheiderSoll"
                      type="number"
                      placeholder="z.B. 10"
                      value={editForm.entscheiderSoll}
                      onChange={(e) => setEditForm({ ...editForm, entscheiderSoll: e.target.value })}
                    />
                  </div>
                )}
                {editForm.trackTermine && (
                  <div className="space-y-2">
                    <Label htmlFor="termineVereinbartSoll">Termine vereinbart</Label>
                    <Input
                      id="termineVereinbartSoll"
                      type="number"
                      placeholder="z.B. 10"
                      value={editForm.termineVereinbartSoll}
                      onChange={(e) => setEditForm({ ...editForm, termineVereinbartSoll: e.target.value })}
                    />
                  </div>
                )}
                {editForm.trackTermine && (
                  <div className="space-y-2">
                    <Label htmlFor="termineStattgefundenSoll">Termine stattgefunden</Label>
                    <Input
                      id="termineStattgefundenSoll"
                      type="number"
                      placeholder="z.B. 8"
                      value={editForm.termineStattgefundenSoll}
                      onChange={(e) => setEditForm({ ...editForm, termineStattgefundenSoll: e.target.value })}
                    />
                  </div>
                )}
                {editForm.trackAbschluesse && (
                  <div className="space-y-2">
                    <Label htmlFor="termineAbschlussSoll">Abschlüsse</Label>
                    <Input
                      id="termineAbschlussSoll"
                      type="number"
                      placeholder="z.B. 5"
                      value={editForm.termineAbschlussSoll}
                      onChange={(e) => setEditForm({ ...editForm, termineAbschlussSoll: e.target.value })}
                    />
                  </div>
                )}
                {editForm.trackEinheiten && (
                  <div className="space-y-2">
                    <Label htmlFor="einheitenSoll">Einheiten</Label>
                    <Input
                      id="einheitenSoll"
                      type="number"
                      placeholder="z.B. 10"
                      value={editForm.einheitenSoll}
                      onChange={(e) => setEditForm({ ...editForm, einheitenSoll: e.target.value })}
                    />
                  </div>
                )}
                {editForm.trackEmpfehlungen && (
                  <div className="space-y-2">
                    <Label htmlFor="empfehlungenSoll">Empfehlungen</Label>
                    <Input
                      id="empfehlungenSoll"
                      type="number"
                      placeholder="z.B. 3"
                      value={editForm.empfehlungenSoll}
                      onChange={(e) => setEditForm({ ...editForm, empfehlungenSoll: e.target.value })}
                    />
                  </div>
                )}
                {editForm.trackKonvertierung && (
                  <div className="space-y-2">
                    <Label htmlFor="konvertierungTerminSoll">Konvertierung (%)</Label>
                    <Input
                      id="konvertierungTerminSoll"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="z.B. 15"
                      value={editForm.konvertierungTerminSoll}
                      onChange={(e) => setEditForm({ ...editForm, konvertierungTerminSoll: e.target.value })}
                    />
                  </div>
                )}
                {editForm.trackAbschlussquote && (
                  <div className="space-y-2">
                    <Label htmlFor="abschlussquoteSoll">Abschlussquote (%)</Label>
                    <Input
                      id="abschlussquoteSoll"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="z.B. 30"
                      value={editForm.abschlussquoteSoll}
                      onChange={(e) => setEditForm({ ...editForm, abschlussquoteSoll: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={handleSaveGoals}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Ziele speichern
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
