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
  AlertCircle,
  Euro,
  Phone,
  Calendar,
  Handshake,
  Gift,
  Heart,
  MessageSquare,
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [feelingScore, setFeelingScore] = useState(5);

  const [formValues, setFormValues] = useState({
    umsatzIst: "",
    kontakteIst: "",
    entscheiderIst: "",
    termineVereinbartIst: "",
    termineStattgefundenIst: "",
    termineErstIst: "",
    termineFolgeIst: "",
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
        if (result.currentWeek?.id) {
          setAlreadySubmitted(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch KPI data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

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
          termineErstIst: formValues.termineErstIst ? parseInt(formValues.termineErstIst) : null,
          termineFolgeIst: formValues.termineFolgeIst ? parseInt(formValues.termineFolgeIst) : null,
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
    } catch (err) {
      setError("Beim Speichern ist ein Fehler aufgetreten.");
      toast({
        title: "Fehler",
        description: "Beim Speichern ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success || alreadySubmitted) {
    return (
      <div className="min-h-screen bg-muted/30">
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
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                  item.href.includes("/kpi") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="flex items-center justify-center p-4 py-12">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {alreadySubmitted && !success ? "Bereits eingereicht!" : "Vielen Dank, " + data?.member?.vorname + "!"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {alreadySubmitted && !success ? (
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
              <Link href={`/member/${memberId}`}>
                <Button className="w-full h-12">
                  Zurück zum Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const member = data?.member;

  return (
    <div className="min-h-screen bg-muted/30">
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
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                item.href.includes("/kpi") ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Content - Same styling as token form */}
      <main className="py-6 px-4 sm:py-8">
        <div className="max-w-lg mx-auto">
          {/* Banner */}
          <div className="rounded-xl overflow-hidden mb-6 shadow-lg">
            <img
              src="/kpiweeklytracking_banner.jpeg"
              alt="NF Mentoring Weekly KPI-Tracking"
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold">
              Hey {member?.vorname}!
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Zeit für dein Weekly Update – trage deine Zahlen für diese Woche ein.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Umsatz (Required) */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base">Umsatz</CardTitle>
                </div>
                <CardDescription>
                  {member?.umsatzSollWoche ? (
                    <>
                      Dein Wochenziel:{" "}
                      <span className="font-semibold text-foreground">
                        {Number(member.umsatzSollWoche).toLocaleString("de-DE", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                        })}
                      </span>
                    </>
                  ) : (
                    "Wie viel Umsatz hast du diese Woche gemacht?"
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
                    placeholder="0"
                    value={formValues.umsatzIst}
                    onChange={(e) => setFormValues({ ...formValues, umsatzIst: e.target.value })}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Kontakte Section */}
            {member?.trackKontakte && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-base">Kontakte</CardTitle>
                  </div>
                  <CardDescription>
                    {member?.kontakteSoll ? (
                      <>
                        Dein Wochenziel:{" "}
                        <span className="font-semibold text-foreground">
                          {member.kontakteSoll} Kontakte
                        </span>
                      </>
                    ) : (
                      "Wie viele Kontakte hast du diese Woche gemacht?"
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="kontakteIst">Kontakte gesamt</Label>
                      <Input
                        id="kontakteIst"
                        type="number"
                        inputMode="numeric"
                        className="h-12"
                        placeholder="0"
                        value={formValues.kontakteIst}
                        onChange={(e) => setFormValues({ ...formValues, kontakteIst: e.target.value })}
                      />
                    </div>
                    {member?.trackEntscheider && (
                      <div className="space-y-2">
                        <Label htmlFor="entscheiderIst">Davon Entscheider</Label>
                        <Input
                          id="entscheiderIst"
                          type="number"
                          inputMode="numeric"
                          className="h-12"
                          placeholder="0"
                          value={formValues.entscheiderIst}
                          onChange={(e) => setFormValues({ ...formValues, entscheiderIst: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Termine Section */}
            {member?.trackTermine && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Termine</CardTitle>
                  </div>
                  <CardDescription>
                    {member?.termineVereinbartSoll ? (
                      <>
                        Dein Wochenziel:{" "}
                        <span className="font-semibold text-foreground">
                          {member.termineVereinbartSoll} Termine
                        </span>
                      </>
                    ) : (
                      "Wie viele Termine hattest du diese Woche?"
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="termineVereinbartIst">Termine vereinbart</Label>
                      <Input
                        id="termineVereinbartIst"
                        type="number"
                        inputMode="numeric"
                        className="h-12"
                        placeholder="0"
                        value={formValues.termineVereinbartIst}
                        onChange={(e) => setFormValues({ ...formValues, termineVereinbartIst: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="termineStattgefundenIst">Termine stattgefunden</Label>
                      <Input
                        id="termineStattgefundenIst"
                        type="number"
                        inputMode="numeric"
                        className="h-12"
                        placeholder="0"
                        value={formValues.termineStattgefundenIst}
                        onChange={(e) => setFormValues({ ...formValues, termineStattgefundenIst: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="termineErstIst">Ersttermine</Label>
                      <Input
                        id="termineErstIst"
                        type="number"
                        inputMode="numeric"
                        className="h-12"
                        placeholder="0"
                        value={formValues.termineErstIst}
                        onChange={(e) => setFormValues({ ...formValues, termineErstIst: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="termineFolgeIst">Folgetermine</Label>
                      <Input
                        id="termineFolgeIst"
                        type="number"
                        inputMode="numeric"
                        className="h-12"
                        placeholder="0"
                        value={formValues.termineFolgeIst}
                        onChange={(e) => setFormValues({ ...formValues, termineFolgeIst: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Abschlüsse Section */}
            {member?.trackAbschluesse && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Handshake className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-base">Abschlüsse</CardTitle>
                  </div>
                  <CardDescription>
                    {member?.termineAbschlussSoll ? (
                      <>
                        Dein Wochenziel:{" "}
                        <span className="font-semibold text-foreground">
                          {member.termineAbschlussSoll} Abschluss-Termine
                        </span>
                      </>
                    ) : (
                      "Wie viele Abschluss-Termine hattest du?"
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="termineAbschlussIst">Abschluss-Termine</Label>
                      <Input
                        id="termineAbschlussIst"
                        type="number"
                        inputMode="numeric"
                        className="h-12"
                        placeholder="0"
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
                        placeholder="0"
                        value={formValues.termineNoshowIst}
                        onChange={(e) => setFormValues({ ...formValues, termineNoshowIst: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Weitere KPIs */}
            {(member?.trackEinheiten || member?.trackEmpfehlungen) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-base">Weitere KPIs</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {member?.trackEinheiten && (
                      <div className="space-y-2">
                        <Label htmlFor="einheitenIst">
                          Einheiten
                          {member?.einheitenSoll && (
                            <span className="text-muted-foreground font-normal ml-1">
                              (Ziel: {member.einheitenSoll})
                            </span>
                          )}
                        </Label>
                        <Input
                          id="einheitenIst"
                          type="number"
                          inputMode="numeric"
                          className="h-12"
                          placeholder="0"
                          value={formValues.einheitenIst}
                          onChange={(e) => setFormValues({ ...formValues, einheitenIst: e.target.value })}
                        />
                      </div>
                    )}
                    {member?.trackEmpfehlungen && (
                      <div className="space-y-2">
                        <Label htmlFor="empfehlungenIst">
                          <div className="flex items-center gap-1">
                            <Gift className="h-4 w-4 text-amber-500" />
                            Empfehlungen
                            {member?.empfehlungenSoll && (
                              <span className="text-muted-foreground font-normal ml-1">
                                (Ziel: {member.empfehlungenSoll})
                              </span>
                            )}
                          </div>
                        </Label>
                        <Input
                          id="empfehlungenIst"
                          type="number"
                          inputMode="numeric"
                          className="h-12"
                          placeholder="0"
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
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-500" />
                  <CardTitle className="text-base">Wie fühlst du dich?</CardTitle>
                </div>
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
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>1</span>
                    <span className="text-2xl font-bold text-foreground">{feelingScore}</span>
                    <span>10</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reflexion */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  <CardTitle className="text-base">Reflexion</CardTitle>
                </div>
                <CardDescription>
                  Nimm dir einen Moment, um über deine Woche nachzudenken
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="heldentat">
                    Was war deine Heldentat diese Woche?
                  </Label>
                  <Textarea
                    id="heldentat"
                    placeholder="Erzähl uns von deinem größten Erfolg..."
                    value={formValues.heldentat}
                    onChange={(e) => setFormValues({ ...formValues, heldentat: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blockiert">
                    Was hat dich diese Woche blockiert?
                  </Label>
                  <Textarea
                    id="blockiert"
                    placeholder="Gab es Herausforderungen oder Hindernisse?"
                    value={formValues.blockiert}
                    onChange={(e) => setFormValues({ ...formValues, blockiert: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="herausforderung">
                    Was ist deine größte Herausforderung für nächste Woche?
                  </Label>
                  <Textarea
                    id="herausforderung"
                    placeholder="Worauf möchtest du dich fokussieren?"
                    value={formValues.herausforderung}
                    onChange={(e) => setFormValues({ ...formValues, herausforderung: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
              {submitting ? (
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
          <Card className="mt-8">
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
                      className="flex items-center justify-between p-4 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">KW {week.weekNumber}</p>
                        <p className="text-sm text-muted-foreground">
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
                          <span className="text-lg font-bold text-muted-foreground">
                            {week.feelingScore}/10
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">Noch kein Verlauf vorhanden</p>
                  <p className="text-sm text-muted-foreground mt-1">
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
