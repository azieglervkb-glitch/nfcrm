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
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  BarChart3,
  Target,
  User,
  Home,
  Loader2,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MemberData {
  vorname: string;
  nachname: string;
  trackKontakte: boolean;
  trackTermine: boolean;
  trackEinheiten: boolean;
  trackEmpfehlungen: boolean;
  trackEntscheider: boolean;
  trackAbschluesse: boolean;
  umsatzSollWoche: number | null;
  kontakteSoll: number | null;
  termineVereinbartSoll: number | null;
  termineStattgefundenSoll: number | null;
  termineAbschlussSoll: number | null;
  einheitenSoll: number | null;
  empfehlungenSoll: number | null;
  entscheiderSoll: number | null;
}

interface KpiData {
  member: MemberData;
  currentWeek: {
    id?: string;
    umsatzIst: number | null;
    kontakteIst: number | null;
    entscheiderIst: number | null;
    termineVereinbartIst: number | null;
    termineStattgefundenIst: number | null;
    termineAbschlussIst: number | null;
    termineNoshowIst: number | null;
    einheitenIst: number | null;
    empfehlungenIst: number | null;
    feelingScore: number | null;
    heldentat: string | null;
    blockiert: string | null;
    herausforderung: string | null;
  } | null;
  history: Array<{
    weekStart: string;
    weekNumber: number;
    umsatzIst: number | null;
    kontakteIst: number | null;
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
  const [success, setSuccess] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [feelingScore, setFeelingScore] = useState(5);

  const [formValues, setFormValues] = useState({
    umsatzIst: "",
    kontakteIst: "",
    entscheiderIst: "",
    termineVereinbartIst: "",
    termineStattgefundenIst: "",
    termineAbschlussIst: "",
    termineNoshowIst: "",
    einheitenIst: "",
    empfehlungenIst: "",
    heldentat: "",
    blockiert: "",
    herausforderung: "",
  });

  useEffect(() => {
    if (memberId) {
      fetchKpiData();
    }
  }, [memberId]);

  const fetchKpiData = async () => {
    try {
      const response = await fetch(`/api/member/kpi/full?memberId=${memberId}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
        // Check if already submitted this week
        if (result.currentWeek?.id) {
          setAlreadySubmitted(true);
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
      const response = await fetch(`/api/member/kpi/full`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          umsatzIst: formValues.umsatzIst ? parseFloat(formValues.umsatzIst) : null,
          kontakteIst: formValues.kontakteIst ? parseInt(formValues.kontakteIst) : null,
          entscheiderIst: formValues.entscheiderIst ? parseInt(formValues.entscheiderIst) : null,
          termineVereinbartIst: formValues.termineVereinbartIst ? parseInt(formValues.termineVereinbartIst) : null,
          termineStattgefundenIst: formValues.termineStattgefundenIst ? parseInt(formValues.termineStattgefundenIst) : null,
          termineAbschlussIst: formValues.termineAbschlussIst ? parseInt(formValues.termineAbschlussIst) : null,
          termineNoshowIst: formValues.termineNoshowIst ? parseInt(formValues.termineNoshowIst) : null,
          einheitenIst: formValues.einheitenIst ? parseInt(formValues.einheitenIst) : null,
          empfehlungenIst: formValues.empfehlungenIst ? parseInt(formValues.empfehlungenIst) : null,
          feelingScore,
          heldentat: formValues.heldentat || null,
          blockiert: formValues.blockiert || null,
          herausforderung: formValues.herausforderung || null,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        toast({
          title: "Gespeichert!",
          description: "Deine KPIs wurden erfolgreich aktualisiert.",
        });
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

  if (success || alreadySubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg border-0">
          <CardContent className="pt-12 pb-10 px-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {alreadySubmitted ? "Bereits eingereicht!" : "Vielen Dank!"}
            </h2>
            <p className="text-gray-600 mb-10 text-base leading-relaxed">
              {alreadySubmitted ? (
                <>
                  Du hast deine KPIs für diese Woche bereits eingereicht.<br />
                  Nächste Woche kannst du wieder tracken.
                </>
              ) : (
                <>
                  Deine KPIs wurden erfolgreich gespeichert.<br />
                  Du erhältst in Kürze dein persönliches Feedback.
                </>
              )}
            </p>
            <div className="space-y-4 max-w-sm mx-auto">
              <Link href={`/member/${memberId}`} className="block">
                <Button className="w-full h-12 text-base font-semibold bg-red-600 hover:bg-red-700">
                  Zurück zum Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const member = data?.member;

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
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold">Dein Weekly KPI-Update</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Hallo {member?.vorname}! Trage deine Zahlen für diese Woche ein.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Umsatz */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Umsatz</CardTitle>
                <CardDescription>
                  {member?.umsatzSollWoche && (
                    <>
                      Dein Wochenziel:{" "}
                      {Number(member.umsatzSollWoche).toLocaleString("de-DE", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                      })}
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="umsatzIst">Umsatz diese Woche (€) *</Label>
                  <Input
                    id="umsatzIst"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    className="h-12 text-lg"
                    value={formValues.umsatzIst}
                    onChange={(e) => setFormValues({ ...formValues, umsatzIst: e.target.value })}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Aktivitäten */}
            {(member?.trackKontakte || member?.trackEntscheider || member?.trackTermine || member?.trackAbschluesse) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Aktivitäten</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {member?.trackKontakte && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="kontakteIst">
                          Kontakte {member?.kontakteSoll ? `(Ziel: ${member.kontakteSoll})` : ""}
                        </Label>
                        <Input
                          id="kontakteIst"
                          type="number"
                          inputMode="numeric"
                          className="h-12"
                          value={formValues.kontakteIst}
                          onChange={(e) => setFormValues({ ...formValues, kontakteIst: e.target.value })}
                        />
                      </div>
                      {member?.trackEntscheider && (
                        <div className="space-y-2">
                          <Label htmlFor="entscheiderIst">
                            Davon Entscheider {member?.entscheiderSoll ? `(Ziel: ${member.entscheiderSoll})` : ""}
                          </Label>
                          <Input
                            id="entscheiderIst"
                            type="number"
                            inputMode="numeric"
                            className="h-12"
                            value={formValues.entscheiderIst}
                            onChange={(e) => setFormValues({ ...formValues, entscheiderIst: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {member?.trackTermine && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="termineVereinbartIst">
                          Termine vereinbart {member?.termineVereinbartSoll ? `(Ziel: ${member.termineVereinbartSoll})` : ""}
                        </Label>
                        <Input
                          id="termineVereinbartIst"
                          type="number"
                          inputMode="numeric"
                          className="h-12"
                          value={formValues.termineVereinbartIst}
                          onChange={(e) => setFormValues({ ...formValues, termineVereinbartIst: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="termineStattgefundenIst">
                          Termine stattgefunden {member?.termineStattgefundenSoll ? `(Ziel: ${member.termineStattgefundenSoll})` : ""}
                        </Label>
                        <Input
                          id="termineStattgefundenIst"
                          type="number"
                          inputMode="numeric"
                          className="h-12"
                          value={formValues.termineStattgefundenIst}
                          onChange={(e) => setFormValues({ ...formValues, termineStattgefundenIst: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {member?.trackAbschluesse && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="termineAbschlussIst">
                          Abschluss-Termine {member?.termineAbschlussSoll ? `(Ziel: ${member.termineAbschlussSoll})` : ""}
                        </Label>
                        <Input
                          id="termineAbschlussIst"
                          type="number"
                          inputMode="numeric"
                          className="h-12"
                          value={formValues.termineAbschlussIst}
                          onChange={(e) => setFormValues({ ...formValues, termineAbschlussIst: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="termineNoshowIst">No-Shows</Label>
                        <Input
                          id="termineNoshowIst"
                          type="number"
                          inputMode="numeric"
                          className="h-12"
                          value={formValues.termineNoshowIst}
                          onChange={(e) => setFormValues({ ...formValues, termineNoshowIst: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Weitere KPIs */}
            {(member?.trackEinheiten || member?.trackEmpfehlungen) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Weitere KPIs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {member?.trackEinheiten && (
                      <div className="space-y-2">
                        <Label htmlFor="einheitenIst">
                          Einheiten {member?.einheitenSoll ? `(Ziel: ${member.einheitenSoll})` : ""}
                        </Label>
                        <Input
                          id="einheitenIst"
                          type="number"
                          inputMode="numeric"
                          className="h-12"
                          value={formValues.einheitenIst}
                          onChange={(e) => setFormValues({ ...formValues, einheitenIst: e.target.value })}
                        />
                      </div>
                    )}
                    {member?.trackEmpfehlungen && (
                      <div className="space-y-2">
                        <Label htmlFor="empfehlungenIst">
                          Empfehlungen {member?.empfehlungenSoll ? `(Ziel: ${member.empfehlungenSoll})` : ""}
                        </Label>
                        <Input
                          id="empfehlungenIst"
                          type="number"
                          inputMode="numeric"
                          className="h-12"
                          value={formValues.empfehlungenIst}
                          onChange={(e) => setFormValues({ ...formValues, empfehlungenIst: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feeling Score */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Wie fühlst du dich?</CardTitle>
                <CardDescription>
                  Bewerte deine Woche auf einer Skala von 1 (schlecht) bis 10 (fantastisch)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Slider
                    value={[feelingScore]}
                    onValueChange={([value]) => setFeelingScore(value)}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>1 - Schlecht</span>
                    <span className="text-2xl font-bold text-gray-900">{feelingScore}</span>
                    <span>10 - Fantastisch</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reflexion */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reflexion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="heldentat">Was war deine Heldentat diese Woche?</Label>
                  <Textarea
                    id="heldentat"
                    placeholder="Erzähl uns von deinem größten Erfolg..."
                    value={formValues.heldentat}
                    onChange={(e) => setFormValues({ ...formValues, heldentat: e.target.value })}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blockiert">Was hat dich diese Woche blockiert?</Label>
                  <Textarea
                    id="blockiert"
                    placeholder="Gab es Herausforderungen oder Hindernisse?"
                    value={formValues.blockiert}
                    onChange={(e) => setFormValues({ ...formValues, blockiert: e.target.value })}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="herausforderung">Was ist deine größte Herausforderung für nächste Woche?</Label>
                  <Textarea
                    id="herausforderung"
                    placeholder="Worauf möchtest du dich fokussieren?"
                    value={formValues.herausforderung}
                    onChange={(e) => setFormValues({ ...formValues, herausforderung: e.target.value })}
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full h-12 text-base bg-red-600 hover:bg-red-700"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                "KPIs absenden"
              )}
            </Button>
          </form>

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle>Dein KPI-Verlauf</CardTitle>
              <CardDescription>Deine vergangenen Wochen im Überblick</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.history && data.history.length > 0 ? (
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
                        {week.umsatzIst !== null && (
                          <span className="font-medium">
                            {Number(week.umsatzIst).toLocaleString("de-DE", {
                              style: "currency",
                              currency: "EUR",
                              minimumFractionDigits: 0,
                            })}
                          </span>
                        )}
                        {week.feelingScore && (
                          <span className="text-lg font-bold text-gray-700">
                            {week.feelingScore}/10
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Noch kein Verlauf vorhanden</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Du hast diese Woche das erste Mal getrackt.<br />
                    Nächste Woche siehst du hier deinen Verlauf.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
