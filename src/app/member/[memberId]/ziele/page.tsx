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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Users,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MemberGoals {
  vorname: string;
  hauptzielEinSatz: string | null;
  umsatzSollWoche: number | null;
  umsatzSollMonat: number | null;
  kontakteSoll: number | null;
  termineVereinbartSoll: number | null;
  termineAbschlussSoll: number | null;
  einheitenSoll: number | null;
  empfehlungenSoll: number | null;
  trackKontakte: boolean;
  trackTermine: boolean;
  trackAbschluesse: boolean;
  trackEinheiten: boolean;
  trackEmpfehlungen: boolean;
  trackEntscheider: boolean;
}

export default function MemberGoalsPage() {
  const params = useParams();
  const memberId = params.memberId as string;
  const { toast } = useToast();

  const [memberGoals, setMemberGoals] = useState<MemberGoals | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Edit form state - includes track toggles
  const [editForm, setEditForm] = useState({
    hauptzielEinSatz: "",
    umsatzSollWoche: "",
    umsatzSollMonat: "",
    kontakteSoll: "",
    termineVereinbartSoll: "",
    termineAbschlussSoll: "",
    einheitenSoll: "",
    empfehlungenSoll: "",
    trackKontakte: false,
    trackTermine: false,
    trackAbschluesse: false,
    trackEinheiten: false,
    trackEmpfehlungen: false,
    trackEntscheider: false,
  });

  useEffect(() => {
    if (memberId) {
      fetchMemberGoals();
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
          termineVereinbartSoll: data.termineVereinbartSoll?.toString() || "",
          termineAbschlussSoll: data.termineAbschlussSoll?.toString() || "",
          einheitenSoll: data.einheitenSoll?.toString() || "",
          empfehlungenSoll: data.empfehlungenSoll?.toString() || "",
          trackKontakte: data.trackKontakte || false,
          trackTermine: data.trackTermine || false,
          trackAbschluesse: data.trackAbschluesse || false,
          trackEinheiten: data.trackEinheiten || false,
          trackEmpfehlungen: data.trackEmpfehlungen || false,
          trackEntscheider: data.trackEntscheider || false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch goals:", error);
    } finally {
      setLoading(false);
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
          termineVereinbartSoll: editForm.termineVereinbartSoll ? parseInt(editForm.termineVereinbartSoll) : null,
          termineAbschlussSoll: editForm.termineAbschlussSoll ? parseInt(editForm.termineAbschlussSoll) : null,
          einheitenSoll: editForm.einheitenSoll ? parseInt(editForm.einheitenSoll) : null,
          empfehlungenSoll: editForm.empfehlungenSoll ? parseInt(editForm.empfehlungenSoll) : null,
          trackKontakte: editForm.trackKontakte,
          trackTermine: editForm.trackTermine,
          trackAbschluesse: editForm.trackAbschluesse,
          trackEinheiten: editForm.trackEinheiten,
          trackEmpfehlungen: editForm.trackEmpfehlungen,
          trackEntscheider: editForm.trackEntscheider,
        }),
      });

      if (response.ok) {
        toast({
          title: "Ziele gespeichert!",
          description: "Deine Änderungen gelten ab der nächsten Woche.",
        });
        setEditDialogOpen(false);
        fetchMemberGoals(); // Refresh data
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

  // Count active KPIs
  const activeKpiCount = [
    memberGoals?.trackKontakte,
    memberGoals?.trackTermine,
    memberGoals?.trackAbschluesse,
    memberGoals?.trackEinheiten,
    memberGoals?.trackEmpfehlungen,
    memberGoals?.trackEntscheider,
  ].filter(Boolean).length;

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

          {/* Info Banner */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800">
                  <strong>Wichtig:</strong> Wenn du deine Ziele änderst, gelten die neuen Werte ab der nächsten Woche.
                  Vergangene Wochen behalten ihre ursprünglichen Ziele für einen fairen Vergleich.
                </p>
              </div>
            </div>
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

          {/* Aktive KPIs */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Aktive KPIs</CardTitle>
                  <CardDescription>
                    {activeKpiCount} von 6 KPIs werden getrackt
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg border ${memberGoals?.trackKontakte ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${memberGoals?.trackKontakte ? "bg-green-500" : "bg-gray-300"}`} />
                    <span className={`text-sm font-medium ${memberGoals?.trackKontakte ? "text-green-800" : "text-gray-500"}`}>
                      Kontakte
                    </span>
                  </div>
                  {memberGoals?.trackKontakte && memberGoals.kontakteSoll && (
                    <p className="text-lg font-bold text-green-700 mt-1">
                      Ziel: {memberGoals.kontakteSoll}
                    </p>
                  )}
                </div>

                <div className={`p-3 rounded-lg border ${memberGoals?.trackTermine ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${memberGoals?.trackTermine ? "bg-green-500" : "bg-gray-300"}`} />
                    <span className={`text-sm font-medium ${memberGoals?.trackTermine ? "text-green-800" : "text-gray-500"}`}>
                      Termine
                    </span>
                  </div>
                  {memberGoals?.trackTermine && memberGoals.termineVereinbartSoll && (
                    <p className="text-lg font-bold text-green-700 mt-1">
                      Ziel: {memberGoals.termineVereinbartSoll}
                    </p>
                  )}
                </div>

                <div className={`p-3 rounded-lg border ${memberGoals?.trackAbschluesse ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${memberGoals?.trackAbschluesse ? "bg-green-500" : "bg-gray-300"}`} />
                    <span className={`text-sm font-medium ${memberGoals?.trackAbschluesse ? "text-green-800" : "text-gray-500"}`}>
                      Abschlüsse
                    </span>
                  </div>
                  {memberGoals?.trackAbschluesse && memberGoals.termineAbschlussSoll && (
                    <p className="text-lg font-bold text-green-700 mt-1">
                      Ziel: {memberGoals.termineAbschlussSoll}
                    </p>
                  )}
                </div>

                <div className={`p-3 rounded-lg border ${memberGoals?.trackEinheiten ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${memberGoals?.trackEinheiten ? "bg-green-500" : "bg-gray-300"}`} />
                    <span className={`text-sm font-medium ${memberGoals?.trackEinheiten ? "text-green-800" : "text-gray-500"}`}>
                      Einheiten
                    </span>
                  </div>
                  {memberGoals?.trackEinheiten && memberGoals.einheitenSoll && (
                    <p className="text-lg font-bold text-green-700 mt-1">
                      Ziel: {memberGoals.einheitenSoll}
                    </p>
                  )}
                </div>

                <div className={`p-3 rounded-lg border ${memberGoals?.trackEmpfehlungen ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${memberGoals?.trackEmpfehlungen ? "bg-green-500" : "bg-gray-300"}`} />
                    <span className={`text-sm font-medium ${memberGoals?.trackEmpfehlungen ? "text-green-800" : "text-gray-500"}`}>
                      Empfehlungen
                    </span>
                  </div>
                  {memberGoals?.trackEmpfehlungen && memberGoals.empfehlungenSoll && (
                    <p className="text-lg font-bold text-green-700 mt-1">
                      Ziel: {memberGoals.empfehlungenSoll}
                    </p>
                  )}
                </div>

                <div className={`p-3 rounded-lg border ${memberGoals?.trackEntscheider ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${memberGoals?.trackEntscheider ? "bg-green-500" : "bg-gray-300"}`} />
                    <span className={`text-sm font-medium ${memberGoals?.trackEntscheider ? "text-green-800" : "text-gray-500"}`}>
                      Entscheider
                    </span>
                  </div>
                  {memberGoals?.trackEntscheider && (
                    <p className="text-xs text-green-600 mt-1">Quote wird getrackt</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Dialog - Redesigned like KPI Setup */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-red-600" />
              Ziele anpassen
            </DialogTitle>
            <DialogDescription>
              Passe deine Ziele an. Änderungen gelten ab der nächsten Woche.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Info Box */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Vergangene Wochen behalten ihre ursprünglichen Ziele. So bleibt dein Fortschritt fair vergleichbar.
                </p>
              </div>
            </div>

            {/* Hauptziel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-red-600" />
                  Dein Hauptziel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="z.B. 30.000€ Monatsumsatz bis Ende des Jahres"
                  value={editForm.hauptzielEinSatz}
                  onChange={(e) => setEditForm({ ...editForm, hauptzielEinSatz: e.target.value })}
                />
              </CardContent>
            </Card>

            {/* Umsatzziele */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Umsatzziele
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* KPIs - Like KPI Setup Form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  KPIs zum Tracken
                </CardTitle>
                <CardDescription>
                  Aktiviere die KPIs, die für dein Business relevant sind.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Kontakte */}
                <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                  editForm.trackKontakte ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                }`}>
                  <Checkbox
                    id="trackKontakte"
                    checked={editForm.trackKontakte}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, trackKontakte: !!checked })}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="trackKontakte" className="font-medium cursor-pointer">
                      Kontakte / Gespräche
                    </Label>
                    {editForm.trackKontakte && (
                      <div>
                        <Label htmlFor="kontakteSoll" className="text-xs text-gray-500">Wochenziel</Label>
                        <Input
                          id="kontakteSoll"
                          type="number"
                          placeholder="z.B. 20"
                          value={editForm.kontakteSoll}
                          onChange={(e) => setEditForm({ ...editForm, kontakteSoll: e.target.value })}
                          className="h-9 mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Termine */}
                <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                  editForm.trackTermine ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                }`}>
                  <Checkbox
                    id="trackTermine"
                    checked={editForm.trackTermine}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, trackTermine: !!checked })}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="trackTermine" className="font-medium cursor-pointer">
                      Termine (vereinbart & stattgefunden)
                    </Label>
                    {editForm.trackTermine && (
                      <div>
                        <Label htmlFor="termineVereinbartSoll" className="text-xs text-gray-500">Wochenziel vereinbarte Termine</Label>
                        <Input
                          id="termineVereinbartSoll"
                          type="number"
                          placeholder="z.B. 10"
                          value={editForm.termineVereinbartSoll}
                          onChange={(e) => setEditForm({ ...editForm, termineVereinbartSoll: e.target.value })}
                          className="h-9 mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Abschlüsse */}
                <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                  editForm.trackAbschluesse ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                }`}>
                  <Checkbox
                    id="trackAbschluesse"
                    checked={editForm.trackAbschluesse}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, trackAbschluesse: !!checked })}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="trackAbschluesse" className="font-medium cursor-pointer">
                      Abschluss-Termine & No-Shows
                    </Label>
                    {editForm.trackAbschluesse && (
                      <div>
                        <Label htmlFor="termineAbschlussSoll" className="text-xs text-gray-500">Wochenziel Abschluss-Termine</Label>
                        <Input
                          id="termineAbschlussSoll"
                          type="number"
                          placeholder="z.B. 5"
                          value={editForm.termineAbschlussSoll}
                          onChange={(e) => setEditForm({ ...editForm, termineAbschlussSoll: e.target.value })}
                          className="h-9 mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Einheiten */}
                <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                  editForm.trackEinheiten ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                }`}>
                  <Checkbox
                    id="trackEinheiten"
                    checked={editForm.trackEinheiten}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, trackEinheiten: !!checked })}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="trackEinheiten" className="font-medium cursor-pointer">
                      Verkaufte Einheiten
                    </Label>
                    {editForm.trackEinheiten && (
                      <div>
                        <Label htmlFor="einheitenSoll" className="text-xs text-gray-500">Wochenziel</Label>
                        <Input
                          id="einheitenSoll"
                          type="number"
                          placeholder="z.B. 10"
                          value={editForm.einheitenSoll}
                          onChange={(e) => setEditForm({ ...editForm, einheitenSoll: e.target.value })}
                          className="h-9 mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Empfehlungen */}
                <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                  editForm.trackEmpfehlungen ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                }`}>
                  <Checkbox
                    id="trackEmpfehlungen"
                    checked={editForm.trackEmpfehlungen}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, trackEmpfehlungen: !!checked })}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="trackEmpfehlungen" className="font-medium cursor-pointer">
                      Erhaltene Empfehlungen
                    </Label>
                    {editForm.trackEmpfehlungen && (
                      <div>
                        <Label htmlFor="empfehlungenSoll" className="text-xs text-gray-500">Wochenziel</Label>
                        <Input
                          id="empfehlungenSoll"
                          type="number"
                          placeholder="z.B. 3"
                          value={editForm.empfehlungenSoll}
                          onChange={(e) => setEditForm({ ...editForm, empfehlungenSoll: e.target.value })}
                          className="h-9 mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Entscheider */}
                <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                  editForm.trackEntscheider ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                }`}>
                  <Checkbox
                    id="trackEntscheider"
                    checked={editForm.trackEntscheider}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, trackEntscheider: !!checked })}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor="trackEntscheider" className="font-medium cursor-pointer">
                      Entscheider-Quote (von Kontakten)
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Tracke, wie viele deiner Kontakte Entscheider sind.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
