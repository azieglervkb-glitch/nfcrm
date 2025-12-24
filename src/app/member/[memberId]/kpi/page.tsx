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
  BarChart3,
  Target,
  User,
  Home,
  Loader2,
  Save,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KpiData {
  member: {
    vorname: string;
    nachname: string;
    kontakteSoll: number | null;
    termineVereinbartSoll: number | null;
    termineAbschlussSoll: number | null;
    umsatzSollWoche: number | null;
  };
  currentWeek: {
    id?: string;
    kontakteIst: number | null;
    termineVereinbartIst: number | null;
    termineAbschlussIst: number | null;
    umsatzIst: number | null;
    feelingScore: number | null;
  } | null;
  history: Array<{
    weekStart: string;
    weekNumber: number;
    kontakteIst: number | null;
    termineVereinbartIst: number | null;
    termineAbschlussIst: number | null;
    umsatzIst: number | null;
    feelingScore: number | null;
  }>;
}

export default function MemberKpiPage() {
  const params = useParams();
  const memberId = params.memberId as string;
  const { toast } = useToast();

  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState({
    kontakteIst: "",
    termineVereinbartIst: "",
    termineAbschlussIst: "",
    umsatzIst: "",
    feelingScore: "3",
  });

  useEffect(() => {
    if (memberId) {
      fetchKpiData();
    }
  }, [memberId]);

  const fetchKpiData = async () => {
    try {
      const response = await fetch(`/api/member/kpi?memberId=${memberId}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
        if (result.currentWeek) {
          setFormValues({
            kontakteIst: result.currentWeek.kontakteIst?.toString() || "",
            termineVereinbartIst: result.currentWeek.termineVereinbartIst?.toString() || "",
            termineAbschlussIst: result.currentWeek.termineAbschlussIst?.toString() || "",
            umsatzIst: result.currentWeek.umsatzIst?.toString() || "",
            feelingScore: result.currentWeek.feelingScore?.toString() || "3",
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
    setSaving(true);

    try {
      const response = await fetch(`/api/member/kpi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          kontakteIst: formValues.kontakteIst ? parseInt(formValues.kontakteIst) : null,
          termineVereinbartIst: formValues.termineVereinbartIst ? parseInt(formValues.termineVereinbartIst) : null,
          termineAbschlussIst: formValues.termineAbschlussIst ? parseInt(formValues.termineAbschlussIst) : null,
          umsatzIst: formValues.umsatzIst ? parseFloat(formValues.umsatzIst) : null,
          feelingScore: parseInt(formValues.feelingScore),
        }),
      });

      if (response.ok) {
        toast({
          title: "Gespeichert!",
          description: "Deine KPIs wurden erfolgreich aktualisiert.",
        });
        fetchKpiData();
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
                      item.href.includes("/kpi")
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
                item.href.includes("/kpi") ? "text-red-600" : "text-gray-600"
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">KPI Tracking</h1>
            <p className="text-gray-600">Trage deine wöchentlichen Zahlen ein</p>
          </div>

          {/* Current Week Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-600" />
                Diese Woche
              </CardTitle>
              <CardDescription>
                Aktualisiere deine KPIs für diese Woche
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {data?.member.kontakteSoll && (
                    <div className="space-y-2">
                      <Label htmlFor="kontakte">
                        Kontakte (Ziel: {data.member.kontakteSoll})
                      </Label>
                      <Input
                        id="kontakte"
                        type="number"
                        min="0"
                        value={formValues.kontakteIst}
                        onChange={(e) =>
                          setFormValues({ ...formValues, kontakteIst: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                  )}

                  {data?.member.termineVereinbartSoll && (
                    <div className="space-y-2">
                      <Label htmlFor="termine">
                        Termine vereinbart (Ziel: {data.member.termineVereinbartSoll})
                      </Label>
                      <Input
                        id="termine"
                        type="number"
                        min="0"
                        value={formValues.termineVereinbartIst}
                        onChange={(e) =>
                          setFormValues({ ...formValues, termineVereinbartIst: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                  )}

                  {data?.member.termineAbschlussSoll && (
                    <div className="space-y-2">
                      <Label htmlFor="abschluesse">
                        Abschlüsse (Ziel: {data.member.termineAbschlussSoll})
                      </Label>
                      <Input
                        id="abschluesse"
                        type="number"
                        min="0"
                        value={formValues.termineAbschlussIst}
                        onChange={(e) =>
                          setFormValues({ ...formValues, termineAbschlussIst: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="umsatz">
                      Umsatz € {data?.member.umsatzSollWoche ? `(Ziel: ${data.member.umsatzSollWoche}€)` : ""}
                    </Label>
                    <Input
                      id="umsatz"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formValues.umsatzIst}
                      onChange={(e) =>
                        setFormValues({ ...formValues, umsatzIst: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Wie fühlst du dich diese Woche?</Label>
                  <div className="flex gap-4 justify-center py-4">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() =>
                          setFormValues({ ...formValues, feelingScore: score.toString() })
                        }
                        className={`text-4xl transition-transform ${
                          formValues.feelingScore === score.toString()
                            ? "scale-125"
                            : "opacity-50 hover:opacity-100"
                        }`}
                      >
                        {score === 1 && "😞"}
                        {score === 2 && "😕"}
                        {score === 3 && "😐"}
                        {score === 4 && "🙂"}
                        {score === 5 && "😄"}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700"
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
                      Speichern
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* History */}
          {data?.history && data.history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Verlauf</CardTitle>
                <CardDescription>Deine letzten Wochen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.history.map((week, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">KW {week.weekNumber}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(week.weekStart).toLocaleDateString("de-DE")}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        {week.kontakteIst !== null && (
                          <span>Kontakte: {week.kontakteIst}</span>
                        )}
                        {week.umsatzIst !== null && (
                          <span>Umsatz: {Number(week.umsatzIst).toLocaleString("de-DE")}€</span>
                        )}
                        {week.feelingScore && (
                          <span className="text-xl">
                            {week.feelingScore === 1 && "😞"}
                            {week.feelingScore === 2 && "😕"}
                            {week.feelingScore === 3 && "😐"}
                            {week.feelingScore === 4 && "🙂"}
                            {week.feelingScore === 5 && "😄"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
