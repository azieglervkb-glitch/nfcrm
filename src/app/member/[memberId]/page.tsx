"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BarChart3,
  Target,
  TrendingUp,
  Calendar,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
  Home,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// KPI Setup Schema
const kpiSetupSchema = z.object({
  hauptzielEinSatz: z.string().min(5, "Bitte formuliere dein Ziel (mind. 5 Zeichen)"),
  umsatzSollWoche: z.number().min(0, "Bitte gib ein gültiges Ziel an"),
  umsatzSollMonat: z.number().min(0, "Bitte gib ein gültiges Ziel an"),
  trackKontakte: z.boolean(),
  trackTermine: z.boolean(),
  trackEinheiten: z.boolean(),
  trackEmpfehlungen: z.boolean(),
  trackEntscheider: z.boolean(),
  trackAbschluesse: z.boolean(),
  kontakteSoll: z.number().optional(),
  termineVereinbartSoll: z.number().optional(),
  termineAbschlussSoll: z.number().optional(),
  einheitenSoll: z.number().optional(),
  empfehlungenSoll: z.number().optional(),
});

type KpiSetupInput = z.infer<typeof kpiSetupSchema>;

interface MemberInfo {
  id: string;
  firstName: string;
  lastName: string;
  kpiTrackingActive: boolean;
  onboardingCompleted: boolean;
  zielMonatsumsatz: number | null;
}

interface DashboardData {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    status: string;
    onboardingDate: string | null;
  };
  currentWeekKpi: {
    kontakteGenerated: number | null;
    kontakteTarget: number;
    termineClosed: number | null;
    termineTarget: number;
    abschluesseCount: number | null;
    abschluesseTarget: number;
  } | null;
  weeklyScore: number;
  streak: number;
  pendingGoals: number;
  completedGoals: number;
}

export default function MemberPortalPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.memberId as string;
  const { toast } = useToast();

  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingSetup, setSubmittingSetup] = useState(false);

  // KPI Setup Form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<KpiSetupInput>({
    resolver: zodResolver(kpiSetupSchema),
    defaultValues: {
      trackKontakte: true,
      trackTermine: true,
      trackEinheiten: false,
      trackEmpfehlungen: false,
      trackEntscheider: false,
      trackAbschluesse: true,
    },
  });

  const trackKontakte = watch("trackKontakte");
  const trackTermine = watch("trackTermine");
  const trackAbschluesse = watch("trackAbschluesse");
  const trackEinheiten = watch("trackEinheiten");
  const trackEmpfehlungen = watch("trackEmpfehlungen");

  useEffect(() => {
    if (memberId) {
      initializeSession();
    }
  }, [memberId]);

  const initializeSession = async () => {
    try {
      // Set the member session via API
      const sessionResponse = await fetch("/api/member/auth/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });

      if (!sessionResponse.ok) {
        const err = await sessionResponse.json();
        setError(err.message || "Mitglied nicht gefunden");
        setLoading(false);
        return;
      }

      const sessionData = await sessionResponse.json();
      setMemberInfo(sessionData.member);

      // Pre-fill KPI setup form with monthly goal if available
      if (sessionData.member.zielMonatsumsatz) {
        setValue("umsatzSollMonat", sessionData.member.zielMonatsumsatz);
        setValue("umsatzSollWoche", Math.round(sessionData.member.zielMonatsumsatz / 4));
      }

      // Only fetch dashboard if KPI tracking is active
      if (sessionData.member.kpiTrackingActive) {
        const dashboardResponse = await fetch(`/api/member/dashboard?memberId=${memberId}`);
        if (dashboardResponse.ok) {
          const result = await dashboardResponse.json();
          setDashboardData(result);
        }
      }
    } catch (err) {
      console.error("Failed to initialize session:", err);
      setError("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const onKpiSetupSubmit = async (data: KpiSetupInput) => {
    setSubmittingSetup(true);

    try {
      const response = await fetch("/api/member/kpi-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, ...data }),
      });

      if (!response.ok) {
        throw new Error("Fehler beim Speichern");
      }

      toast({
        title: "KPI-Tracking aktiviert!",
        description: "Deine Ziele wurden gespeichert. Du kannst jetzt deine KPIs tracken.",
      });

      // Reload the page to show dashboard
      window.location.reload();
    } catch (err) {
      toast({
        title: "Fehler",
        description: "Beim Speichern ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setSubmittingSetup(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Lade dein Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src="/nf-logo.png" alt="NF Mentoring" className="h-12 w-auto mx-auto mb-4" />
            <CardTitle className="text-red-600">Zugang nicht möglich</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600">Bitte kontaktiere uns, wenn du Hilfe benötigst.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show KPI Setup Form if kpiTrackingActive is false
  if (memberInfo && !memberInfo.kpiTrackingActive) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 px-4 sm:py-8">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-4">
              <img src="/nf-logo.png" alt="NF Mentoring" className="h-12 sm:h-16 w-auto" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">Starte dein persönliches KPI-Tracking</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              {memberInfo.firstName}, lege deine Ziele und die KPIs fest, die du tracken möchtest.
            </p>
          </div>

          <form onSubmit={handleSubmit(onKpiSetupSubmit)} className="space-y-4 sm:space-y-6">
            {/* Hauptziel */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-lg">Dein Hauptziel</CardTitle>
                </div>
                <CardDescription>Formuliere dein wichtigstes Ziel in einem Satz.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="hauptzielEinSatz">Mein Ziel ist... *</Label>
                  <Input
                    id="hauptzielEinSatz"
                    placeholder="z.B. 30.000€ Monatsumsatz bis Ende des Jahres"
                    {...register("hauptzielEinSatz")}
                    className={`h-12 ${errors.hauptzielEinSatz ? "border-red-500" : ""}`}
                  />
                  {errors.hauptzielEinSatz && (
                    <p className="text-xs text-red-500">{errors.hauptzielEinSatz.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Umsatzziele */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-lg">Umsatzziele</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="umsatzSollMonat">Monatliches Umsatzziel (€) *</Label>
                  <Input
                    id="umsatzSollMonat"
                    type="number"
                    inputMode="numeric"
                    placeholder="z.B. 20000"
                    {...register("umsatzSollMonat", { valueAsNumber: true })}
                    className={`h-12 ${errors.umsatzSollMonat ? "border-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="umsatzSollWoche">Wöchentliches Umsatzziel (€) *</Label>
                  <Input
                    id="umsatzSollWoche"
                    type="number"
                    inputMode="numeric"
                    placeholder="z.B. 5000"
                    {...register("umsatzSollWoche", { valueAsNumber: true })}
                    className={`h-12 ${errors.umsatzSollWoche ? "border-red-500" : ""}`}
                  />
                </div>
              </CardContent>
            </Card>

            {/* KPIs auswählen */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-lg">Welche KPIs möchtest du tracken?</CardTitle>
                </div>
                <CardDescription>Wähle die Kennzahlen, die für dein Business relevant sind.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Kontakte */}
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white">
                  <Checkbox
                    id="trackKontakte"
                    checked={trackKontakte}
                    onCheckedChange={(checked) => setValue("trackKontakte", !!checked)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="trackKontakte" className="font-medium cursor-pointer">
                      Kontakte / Gespräche
                    </Label>
                    {trackKontakte && (
                      <div>
                        <Label htmlFor="kontakteSoll" className="text-xs text-gray-500">Wochenziel</Label>
                        <Input
                          id="kontakteSoll"
                          type="number"
                          inputMode="numeric"
                          placeholder="z.B. 20"
                          {...register("kontakteSoll", { valueAsNumber: true })}
                          className="h-10 mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Termine */}
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white">
                  <Checkbox
                    id="trackTermine"
                    checked={trackTermine}
                    onCheckedChange={(checked) => setValue("trackTermine", !!checked)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="trackTermine" className="font-medium cursor-pointer">
                      Termine (vereinbart & stattgefunden)
                    </Label>
                    {trackTermine && (
                      <div>
                        <Label htmlFor="termineVereinbartSoll" className="text-xs text-gray-500">Wochenziel vereinbarte Termine</Label>
                        <Input
                          id="termineVereinbartSoll"
                          type="number"
                          inputMode="numeric"
                          placeholder="z.B. 10"
                          {...register("termineVereinbartSoll", { valueAsNumber: true })}
                          className="h-10 mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Abschlüsse */}
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white">
                  <Checkbox
                    id="trackAbschluesse"
                    checked={trackAbschluesse}
                    onCheckedChange={(checked) => setValue("trackAbschluesse", !!checked)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="trackAbschluesse" className="font-medium cursor-pointer">
                      Abschluss-Termine & No-Shows
                    </Label>
                    {trackAbschluesse && (
                      <div>
                        <Label htmlFor="termineAbschlussSoll" className="text-xs text-gray-500">Wochenziel Abschluss-Termine</Label>
                        <Input
                          id="termineAbschlussSoll"
                          type="number"
                          inputMode="numeric"
                          placeholder="z.B. 5"
                          {...register("termineAbschlussSoll", { valueAsNumber: true })}
                          className="h-10 mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Einheiten */}
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white">
                  <Checkbox
                    id="trackEinheiten"
                    checked={trackEinheiten}
                    onCheckedChange={(checked) => setValue("trackEinheiten", !!checked)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="trackEinheiten" className="font-medium cursor-pointer">
                      Verkaufte Einheiten
                    </Label>
                    {trackEinheiten && (
                      <div>
                        <Label htmlFor="einheitenSoll" className="text-xs text-gray-500">Wochenziel</Label>
                        <Input
                          id="einheitenSoll"
                          type="number"
                          inputMode="numeric"
                          placeholder="z.B. 10"
                          {...register("einheitenSoll", { valueAsNumber: true })}
                          className="h-10 mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Empfehlungen */}
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white">
                  <Checkbox
                    id="trackEmpfehlungen"
                    checked={trackEmpfehlungen}
                    onCheckedChange={(checked) => setValue("trackEmpfehlungen", !!checked)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="trackEmpfehlungen" className="font-medium cursor-pointer">
                      Erhaltene Empfehlungen
                    </Label>
                    {trackEmpfehlungen && (
                      <div>
                        <Label htmlFor="empfehlungenSoll" className="text-xs text-gray-500">Wochenziel</Label>
                        <Input
                          id="empfehlungenSoll"
                          type="number"
                          inputMode="numeric"
                          placeholder="z.B. 3"
                          {...register("empfehlungenSoll", { valueAsNumber: true })}
                          className="h-10 mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Entscheider */}
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white">
                  <Checkbox
                    id="trackEntscheider"
                    {...register("trackEntscheider")}
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
              type="submit"
              className="w-full h-12 bg-red-600 hover:bg-red-700"
              disabled={submittingSetup}
            >
              {submittingSetup ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  KPI-Tracking starten
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Show Dashboard if KPI tracking is active
  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Keine Daten gefunden</p>
      </div>
    );
  }

  const kpiProgress = dashboardData.currentWeekKpi
    ? {
        kontakte: dashboardData.currentWeekKpi.kontakteTarget > 0
          ? Math.round(((dashboardData.currentWeekKpi.kontakteGenerated || 0) / dashboardData.currentWeekKpi.kontakteTarget) * 100)
          : 0,
        termine: dashboardData.currentWeekKpi.termineTarget > 0
          ? Math.round(((dashboardData.currentWeekKpi.termineClosed || 0) / dashboardData.currentWeekKpi.termineTarget) * 100)
          : 0,
        abschluesse: dashboardData.currentWeekKpi.abschluesseTarget > 0
          ? Math.round(((dashboardData.currentWeekKpi.abschluesseCount || 0) / dashboardData.currentWeekKpi.abschluesseTarget) * 100)
          : 0,
      }
    : null;

  const navItems = [
    { href: `/member/${memberId}`, icon: Home, label: "Dashboard" },
    { href: `/member/${memberId}/kpi`, icon: BarChart3, label: "KPI Tracking" },
    { href: `/member/${memberId}/ziele`, icon: Target, label: "Meine Ziele" },
    { href: `/member/${memberId}/profil`, icon: User, label: "Profil" },
  ];

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
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Willkommen, {dashboardData.member.firstName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 hover:text-red-600"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Welcome Header */}
          <div className="bg-[#ae1d2b]/90 rounded-xl p-6 text-white">
            <h1 className="text-2xl font-bold">Willkommen zurück, {dashboardData.member.firstName}!</h1>
            <p className="text-red-100 mt-1">Hier ist dein aktueller Fortschritt</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Wochen-Score</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.weeklyScore}%</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-full">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Streak</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.streak} Wochen</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-full">
                    <Calendar className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ziele erreicht</p>
                    <p className="text-2xl font-bold text-green-600">{dashboardData.completedGoals}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-full">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Offen</p>
                    <p className="text-2xl font-bold text-orange-600">{dashboardData.pendingGoals}</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-full">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Week KPIs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-red-600" />
                    KPIs dieser Woche
                  </CardTitle>
                  <CardDescription>Verfolge deinen wöchentlichen Fortschritt</CardDescription>
                </div>
                <Link href={`/member/${memberId}/kpi`}>
                  <Button className="bg-red-600 hover:bg-red-700">
                    KPIs eintragen
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {kpiProgress ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Kontakte</span>
                      <span className="text-sm text-gray-600">
                        {dashboardData.currentWeekKpi?.kontakteGenerated || 0} / {dashboardData.currentWeekKpi?.kontakteTarget || 0}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${kpiProgress.kontakte >= 100 ? "bg-green-500" : "bg-blue-500"}`}
                        style={{ width: `${Math.min(kpiProgress.kontakte, 100)}%` }}
                      />
                    </div>
                    {kpiProgress.kontakte >= 100 && <Badge className="bg-green-100 text-green-800">Ziel erreicht!</Badge>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Termine</span>
                      <span className="text-sm text-gray-600">
                        {dashboardData.currentWeekKpi?.termineClosed || 0} / {dashboardData.currentWeekKpi?.termineTarget || 0}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${kpiProgress.termine >= 100 ? "bg-green-500" : "bg-purple-500"}`}
                        style={{ width: `${Math.min(kpiProgress.termine, 100)}%` }}
                      />
                    </div>
                    {kpiProgress.termine >= 100 && <Badge className="bg-green-100 text-green-800">Ziel erreicht!</Badge>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Abschlüsse</span>
                      <span className="text-sm text-gray-600">
                        {dashboardData.currentWeekKpi?.abschluesseCount || 0} / {dashboardData.currentWeekKpi?.abschluesseTarget || 0}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${kpiProgress.abschluesse >= 100 ? "bg-green-500" : "bg-orange-500"}`}
                        style={{ width: `${Math.min(kpiProgress.abschluesse, 100)}%` }}
                      />
                    </div>
                    {kpiProgress.abschluesse >= 100 && <Badge className="bg-green-100 text-green-800">Ziel erreicht!</Badge>}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">Diese Woche noch keine KPIs eingetragen</p>
                  <Link href={`/member/${memberId}/kpi`}>
                    <Button className="bg-red-600 hover:bg-red-700">Jetzt starten</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-red-600" />
                  Meine Ziele
                </CardTitle>
                <CardDescription>Verwalte deine S.M.A.R.T. Ziele</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/member/${memberId}/ziele`}>
                  <Button variant="outline" className="w-full">
                    Ziele ansehen
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  KPI Verlauf
                </CardTitle>
                <CardDescription>Analysiere deine vergangene Performance</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/member/${memberId}/kpi/verlauf`}>
                  <Button variant="outline" className="w-full">
                    Verlauf ansehen
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
