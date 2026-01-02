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
  Euro,
  Phone,
  Handshake,
  Gift,
  Settings,
  Percent,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// Zod 4 compatible helpers - include z.null() in union so Zod infers output as number | null
// NaN from empty number inputs is transformed to null
const optionalNumericField = z
  .union([z.number(), z.nan(), z.null()])
  .transform((val) => {
    if (val === null) return null;
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
    return null;
  });

const optionalPercentField = z
  .union([z.number(), z.nan(), z.null()])
  .transform((val) => {
    if (val === null) return null;
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
    return null;
  });

const requiredNumericField = (minValue: number, errorMessage: string) =>
  z
    .union([z.number(), z.nan()])
    .refine((val): val is number => typeof val === 'number' && !Number.isNaN(val), { message: errorMessage })
    .refine((val) => val >= minValue, { message: errorMessage });

// KPI Setup Schema - identical to token-based form
const kpiSetupSchema = z.object({
  // Ziel
  umsatzSollMonat: requiredNumericField(1, "Bitte gib ein gültiges Ziel an"),

  // KPIs
  trackKontakte: z.boolean(),
  kontakteSoll: optionalNumericField,
  trackEntscheider: z.boolean(),

  trackTermine: z.boolean(),
  termineVereinbartSoll: optionalNumericField,

  trackKonvertierung: z.boolean(),
  konvertierungTerminSoll: optionalPercentField,

  trackAbschluesse: z.boolean(),
  termineAbschlussSoll: optionalNumericField,

  trackAbschlussquote: z.boolean(),
  abschlussquoteSoll: optionalPercentField,

  trackEinheiten: z.boolean(),
  einheitenSoll: optionalNumericField,

  trackEmpfehlungen: z.boolean(),
  empfehlungenSoll: optionalNumericField,

  // Kontext & Motivation
  wasNervtAmMeisten: z.string().optional(),
  hauptzielEinSatz: z.string().min(5, "Bitte formuliere dein Ziel (mind. 5 Zeichen)"),
})
// PFLICHT KPIs: Kontakte und Termine müssen Zielwert haben wenn aktiviert
.refine((data) => !data.trackKontakte || (data.kontakteSoll && data.kontakteSoll > 0), {
  message: "Bitte gib ein Ziel für Kontakte an",
  path: ["kontakteSoll"],
}).refine((data) => !data.trackTermine || (data.termineVereinbartSoll && data.termineVereinbartSoll > 0), {
  message: "Bitte gib ein Ziel für Termine an",
  path: ["termineVereinbartSoll"],
})
// Abschluss-Termine: Zielwert ist OPTIONAL (trackAbschluesse ist Pflicht, aber Ziel nicht)
// OPTIONAL KPIs: Konvertierung und Abschlussquote müssen Zielwert haben wenn aktiviert
.refine((data) => !data.trackKonvertierung || (data.konvertierungTerminSoll !== null && data.konvertierungTerminSoll !== undefined && data.konvertierungTerminSoll >= 0), {
  message: "Bitte gib ein Ziel für Konvertierung an",
  path: ["konvertierungTerminSoll"],
}).refine((data) => !data.trackAbschlussquote || (data.abschlussquoteSoll !== null && data.abschlussquoteSoll !== undefined && data.abschlussquoteSoll >= 0), {
  message: "Bitte gib ein Ziel für Abschlussquote an",
  path: ["abschlussquoteSoll"],
});
// Einheiten und Empfehlungen: Zielwert ist komplett OPTIONAL

type KpiSetupInput = z.infer<typeof kpiSetupSchema>;

interface MemberInfo {
  id: string;
  firstName: string;
  lastName: string;
  kpiTrackingEnabled: boolean;
  kpiSetupCompleted: boolean;
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
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<KpiSetupInput>({
    resolver: zodResolver(kpiSetupSchema),
    mode: "onTouched", // Validate when field is touched, then on change
    reValidateMode: "onChange", // Re-validate on every change after first validation
    defaultValues: {
      // Numeric fields - NaN represents empty (same as valueAsNumber for empty input)
      umsatzSollMonat: NaN,
      kontakteSoll: NaN,
      termineVereinbartSoll: NaN,
      termineAbschlussSoll: NaN,
      konvertierungTerminSoll: NaN,
      abschlussquoteSoll: NaN,
      einheitenSoll: NaN,
      empfehlungenSoll: NaN,
      // Boolean fields
      trackKontakte: true,      // PFLICHT
      trackEntscheider: false,
      trackTermine: true,       // PFLICHT
      trackKonvertierung: false,
      trackAbschluesse: true,   // PFLICHT
      trackAbschlussquote: false,
      trackEinheiten: false,
      trackEmpfehlungen: false,
      // Text fields
      hauptzielEinSatz: "",
      wasNervtAmMeisten: "",
    },
  });

  const trackKontakte = watch("trackKontakte");
  const trackEntscheider = watch("trackEntscheider");
  const trackTermine = watch("trackTermine");
  const trackKonvertierung = watch("trackKonvertierung");
  const trackAbschluesse = watch("trackAbschluesse");
  const trackAbschlussquote = watch("trackAbschlussquote");
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
        setValue("umsatzSollMonat", Number(sessionData.member.zielMonatsumsatz));
      }

      // Only fetch dashboard if KPI setup is completed
      if (sessionData.member.kpiSetupCompleted) {
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

  // Show KPI Setup Form if kpiSetupCompleted is false
  // The API computes this value using multiple indicators (kpiSetupCompleted, kpiTrackingEnabled, kpiTrackingActive, hauptzielEinSatz)
  if (memberInfo && !memberInfo.kpiSetupCompleted) {
    return (
      <div className="min-h-screen bg-muted/30 py-6 px-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Banner */}
          <div className="rounded-xl overflow-hidden mb-6 shadow-lg">
            <img
              src="/kpitracking_banner.jpeg"
              alt="NF Mentoring KPI-Tracking"
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold">
              Hey {memberInfo.firstName}! Starte dein KPI-Tracking
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-2xl mx-auto">
              Lege fest, welche Kennzahlen du ab jetzt wöchentlich messen möchtest.
            </p>
          </div>

          <form onSubmit={handleSubmit(onKpiSetupSubmit)} className="space-y-6">
            {/* Validation Error Summary - shows after first submit attempt */}
            {isSubmitted && Object.keys(errors).length > 0 && (() => {
              // Map of field keys to German labels
              const errorLabels: Record<string, string> = {
                umsatzSollMonat: "Monatliches Umsatzziel",
                kontakteSoll: "Ziel für Kontakte pro Woche",
                termineVereinbartSoll: "Ziel für Termine pro Woche",
                termineAbschlussSoll: "Ziel für Abschluss-Termine pro Woche",
                konvertierungTerminSoll: "Ziel für Konvertierungsquote",
                abschlussquoteSoll: "Ziel für Abschlussquote",
                hauptzielEinSatz: "Dein Hauptziel in einem Satz",
              };

              // Get all error keys and map to labels
              const errorKeys = Object.keys(errors);
              const errorItems = errorKeys.map(key => {
                const label = errorLabels[key];
                const errorObj = errors[key as keyof typeof errors];
                const message = errorObj && typeof errorObj === 'object' && 'message' in errorObj
                  ? (errorObj as { message?: string }).message
                  : null;
                return label || message || `Fehler bei: ${key}`;
              });

              return (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <p className="font-semibold text-destructive">
                      Bitte fülle folgende Pflichtfelder aus:
                    </p>
                  </div>
                  <ul className="list-disc list-inside text-sm text-destructive space-y-1 ml-2">
                    {errorItems.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* Dein Ziel */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-primary" />
                  <CardTitle>Dein Ziel</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="umsatzSollMonat">Dein monatliches Umsatzziel *</Label>
                  <p className="text-xs text-muted-foreground">
                    Welchen Umsatz möchtest du aktuell pro Monat erreichen?
                  </p>
                  <Input
                    id="umsatzSollMonat"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    {...register("umsatzSollMonat", { valueAsNumber: true })}
                    placeholder="z.B. 20000"
                    className={errors.umsatzSollMonat ? "border-destructive" : ""}
                  />
                  {errors.umsatzSollMonat && (
                    <p className="text-xs text-destructive">{errors.umsatzSollMonat.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* KPIs */}
            <Card>
              <CardHeader>
                <CardTitle>Welche KPIs möchtest du tracken?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Bitte suche die für dich richtigen KPIs aus und befülle das Formular. Felder die
                  du leer lässt werden im künftigen Tracking nicht berücksichtigt. Sollte sich deine
                  Situation ändern oder du deine KPI's anpassen wollen, dann fülle dieses Formular
                  einfach erneut aus. Ab diesem Zeitpunkt greifen dann die aktualisierten
                  Ziel-KPI's
                </p>

                {/* Kontakte */}
                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <Checkbox
                    id="trackKontakte"
                    checked={trackKontakte}
                    onCheckedChange={(checked) => {
                      setValue("trackKontakte", !!checked);
                      if (!checked) setValue("trackEntscheider", false);
                      setTimeout(() => trigger("kontakteSoll"), 0);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-red-500" />
                      <Label htmlFor="trackKontakte" className="font-semibold cursor-pointer">
                        Kontakte / Calls pro Woche tracken *
                      </Label>
                    </div>
                    {trackKontakte && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="kontakteSoll" className="text-sm">
                            Ziel - Kontakte pro Woche (Calls, Anschreiben etc.) *
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Setze dir ein realistisches aber ambitioniertes Ziel. Beispiel: 20 Calls/Tag
                            x 5 Tage = 100 Calls/Woche.
                          </p>
                          <Input
                            id="kontakteSoll"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            {...register("kontakteSoll", { valueAsNumber: true })}
                            placeholder="z.B. 100"
                            className={errors.kontakteSoll ? "border-destructive" : ""}
                          />
                          {errors.kontakteSoll && (
                            <p className="text-xs text-destructive">{errors.kontakteSoll.message}</p>
                          )}
                        </div>
                        {/* Sub-option: Entscheider */}
                        <div className="flex items-center gap-2 pl-2 pt-2 border-t">
                          <Checkbox
                            id="trackEntscheider"
                            checked={trackEntscheider}
                            onCheckedChange={(checked) => setValue("trackEntscheider", !!checked)}
                          />
                          <Label htmlFor="trackEntscheider" className="text-sm cursor-pointer">
                            Davon Entscheider separat tracken
                          </Label>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Gesamttermine */}
                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <Checkbox
                    id="trackTermine"
                    checked={trackTermine}
                    onCheckedChange={(checked) => {
                      setValue("trackTermine", !!checked);
                      setTimeout(() => trigger("termineVereinbartSoll"), 0);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <Label htmlFor="trackTermine" className="font-semibold cursor-pointer">
                        Gesamttermine tracken *
                      </Label>
                    </div>
                    {trackTermine && (
                      <div className="space-y-2">
                        <Label htmlFor="termineVereinbartSoll" className="text-sm">
                          Ziel: Termine pro Woche *
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Bitte gib ein für dich realistisches aber ambitioniertes Ziel an. Die Terminanzahl umfasst alle Arten von Terminen (Ersttermin, Abschlusstermin, Service-Termin etc.)
                        </p>
                        <Input
                          id="termineVereinbartSoll"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          {...register("termineVereinbartSoll", { valueAsNumber: true })}
                          placeholder="z.B. 15"
                          className={errors.termineVereinbartSoll ? "border-destructive" : ""}
                        />
                        {errors.termineVereinbartSoll && (
                          <p className="text-xs text-destructive">{errors.termineVereinbartSoll.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Konvertierung (Kontakt → Termin %) */}
                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <Checkbox
                    id="trackKonvertierung"
                    checked={trackKonvertierung}
                    onCheckedChange={(checked) => {
                      setValue("trackKonvertierung", !!checked);
                      setTimeout(() => trigger("konvertierungTerminSoll"), 0);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-500" />
                      <Label htmlFor="trackKonvertierung" className="font-semibold cursor-pointer">
                        Konvertierung tracken (Kontakt → Termin)
                      </Label>
                    </div>
                    {trackKonvertierung && (
                      <div className="space-y-2">
                        <Label htmlFor="konvertierungTerminSoll" className="text-sm">
                          Ziel: Konvertierungsquote in % *
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Wie viel Prozent deiner Kontakte sollen zu einem Termin führen?
                        </p>
                        <div className="flex items-center gap-2">
                          <Input
                            id="konvertierungTerminSoll"
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            min="0"
                            max="100"
                            {...register("konvertierungTerminSoll", { valueAsNumber: true })}
                            placeholder="z.B. 15"
                            className={`max-w-[120px] ${errors.konvertierungTerminSoll ? "border-destructive" : ""}`}
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                        {errors.konvertierungTerminSoll && (
                          <p className="text-xs text-destructive">{errors.konvertierungTerminSoll.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Abschluss-Termine */}
                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <Checkbox
                    id="trackAbschluesse"
                    checked={trackAbschluesse}
                    onCheckedChange={(checked) => {
                      setValue("trackAbschluesse", !!checked);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Handshake className="h-5 w-5 text-green-600" />
                      <Label htmlFor="trackAbschluesse" className="font-semibold cursor-pointer">
                        Abschluss-Termine & No-Shows tracken *
                      </Label>
                    </div>
                    {trackAbschluesse && (
                      <div className="space-y-2">
                        <Label htmlFor="termineAbschlussSoll" className="text-sm">
                          Ziel: Abschluss-Termine pro Woche (optional)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Wie viele Abschluss-Termine planst du pro Woche? No-Shows werden automatisch
                          mit erfasst.
                        </p>
                        <Input
                          id="termineAbschlussSoll"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          {...register("termineAbschlussSoll", { valueAsNumber: true })}
                          placeholder="z.B. 5"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Abschlussquote (Termin → Abschluss %) */}
                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <Checkbox
                    id="trackAbschlussquote"
                    checked={trackAbschlussquote}
                    onCheckedChange={(checked) => {
                      setValue("trackAbschlussquote", !!checked);
                      setTimeout(() => trigger("abschlussquoteSoll"), 0);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Percent className="h-5 w-5 text-orange-500" />
                      <Label htmlFor="trackAbschlussquote" className="font-semibold cursor-pointer">
                        Abschlussquote tracken (Termin → Abschluss)
                      </Label>
                    </div>
                    {trackAbschlussquote && (
                      <div className="space-y-2">
                        <Label htmlFor="abschlussquoteSoll" className="text-sm">
                          Ziel: Abschlussquote in % *
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Wie viel Prozent deiner Termine sollen zu einem Abschluss führen?
                        </p>
                        <div className="flex items-center gap-2">
                          <Input
                            id="abschlussquoteSoll"
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            min="0"
                            max="100"
                            {...register("abschlussquoteSoll", { valueAsNumber: true })}
                            placeholder="z.B. 30"
                            className={`max-w-[120px] ${errors.abschlussquoteSoll ? "border-destructive" : ""}`}
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                        {errors.abschlussquoteSoll && (
                          <p className="text-xs text-destructive">{errors.abschlussquoteSoll.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Einheiten */}
                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <Checkbox
                    id="trackEinheiten"
                    checked={trackEinheiten}
                    onCheckedChange={(checked) => {
                      setValue("trackEinheiten", !!checked);
                      setTimeout(() => trigger("einheitenSoll"), 0);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-500" />
                      <Label htmlFor="trackEinheiten" className="font-semibold cursor-pointer">
                        Einheiten / Punkte tracken
                      </Label>
                    </div>
                    {trackEinheiten && (
                      <div className="space-y-2">
                        <Label htmlFor="einheitenSoll" className="text-sm">
                          Ziel: Einheiten / Punkte pro Woche
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Falls du Punkte/Einheiten für dein Unternehmen trackst.
                        </p>
                        <Input
                          id="einheitenSoll"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          {...register("einheitenSoll", { valueAsNumber: true })}
                          placeholder="z.B. 10"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Empfehlungen */}
                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <Checkbox
                    id="trackEmpfehlungen"
                    checked={trackEmpfehlungen}
                    onCheckedChange={(checked) => {
                      setValue("trackEmpfehlungen", !!checked);
                      setTimeout(() => trigger("empfehlungenSoll"), 0);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-amber-500" />
                      <Label htmlFor="trackEmpfehlungen" className="font-semibold cursor-pointer">
                        Empfehlungen tracken
                      </Label>
                    </div>
                    {trackEmpfehlungen && (
                      <div className="space-y-2">
                        <Label htmlFor="empfehlungenSoll" className="text-sm">
                          Ziel: Empfehlungen pro Woche
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Wie viele Empfehlungen willst du pro Woche generieren?
                        </p>
                        <Input
                          id="empfehlungenSoll"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          {...register("empfehlungenSoll", { valueAsNumber: true })}
                          placeholder="z.B. 3"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kontext & Motivation */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-500" />
                  <CardTitle>Kontext & Motivation</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="wasNervtAmMeisten">Was nervt dich aktuell am meisten?</Label>
                  <p className="text-xs text-muted-foreground">
                    Womit kämpfst du derzeit am meisten oder was bremst dich?
                  </p>
                  <Textarea
                    id="wasNervtAmMeisten"
                    {...register("wasNervtAmMeisten")}
                    placeholder="Beschreibe deine größten Herausforderungen..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hauptzielEinSatz">
                    Dein Hauptziel in einem Satz <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Formuliere dein Hauptziel kurz und klar.
                  </p>
                  <Textarea
                    id="hauptzielEinSatz"
                    {...register("hauptzielEinSatz")}
                    placeholder="z.B. 30.000€ Monatsumsatz bis Ende des Jahres"
                    rows={3}
                    className={errors.hauptzielEinSatz ? "border-destructive" : ""}
                  />
                  {errors.hauptzielEinSatz && (
                    <p className="text-xs text-destructive">{errors.hauptzielEinSatz.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full h-12" disabled={submittingSetup}>
              {submittingSetup ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                "KPI-Tracking starten"
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
