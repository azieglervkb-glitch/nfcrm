"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, Target, TrendingUp, Users, Calendar } from "lucide-react";

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

interface MemberData {
  vorname: string;
  nachname: string;
  zielMonatsumsatz: number | null;
}

export default function KpiSetupFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [token, setToken] = useState<string>("");
  const [isPreview, setIsPreview] = useState(false);

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
    async function loadData() {
      const resolvedParams = await params;
      setToken(resolvedParams.token);

      try {
        const response = await fetch(`/api/forms/kpi-setup/${resolvedParams.token}`);
        if (!response.ok) {
          throw new Error("Token ungültig oder abgelaufen");
        }
        const data = await response.json();
        setMemberData(data.member);
        setIsPreview(data.isPreview || false);

        // Pre-fill monthly goal if available
        if (data.member.zielMonatsumsatz) {
          setValue("umsatzSollMonat", Number(data.member.zielMonatsumsatz));
          setValue("umsatzSollWoche", Math.round(Number(data.member.zielMonatsumsatz) / 4));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params, setValue]);

  const onSubmit = async (data: KpiSetupInput) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/forms/kpi-setup/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Speichern");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !memberData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Fehler</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">KPI-Tracking aktiviert!</h2>
            <p className="text-muted-foreground mb-4">
              Super, {memberData?.vorname}! Dein persönliches KPI-Tracking ist jetzt eingerichtet.
            </p>
            <p className="text-sm text-muted-foreground">
              Du erhältst jeden Montag einen Link, um deine wöchentlichen KPIs einzutragen.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4 sm:py-8">
      <div className="max-w-lg mx-auto">
        {/* Preview Banner */}
        {isPreview && (
          <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-lg mb-4 text-center text-sm">
            Vorschau-Modus – Daten werden nicht gespeichert
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/nf-logo.png"
              alt="NF Mentoring"
              className="h-12 sm:h-16 w-auto"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">Starte dein persönliches KPI-Tracking</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {memberData?.vorname}, lege deine Ziele und die KPIs fest, die du tracken möchtest.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Hauptziel */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Dein Hauptziel</CardTitle>
              </div>
              <CardDescription>
                Formuliere dein wichtigstes Ziel in einem Satz.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="hauptzielEinSatz">Mein Ziel ist... *</Label>
                <Input
                  id="hauptzielEinSatz"
                  placeholder="z.B. 30.000€ Monatsumsatz bis Ende des Jahres"
                  {...register("hauptzielEinSatz")}
                  className={`h-12 ${errors.hauptzielEinSatz ? "border-destructive" : ""}`}
                />
                {errors.hauptzielEinSatz && (
                  <p className="text-xs text-destructive">{errors.hauptzielEinSatz.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Umsatzziele */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
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
                  className={`h-12 ${errors.umsatzSollMonat ? "border-destructive" : ""}`}
                />
                {errors.umsatzSollMonat && (
                  <p className="text-xs text-destructive">{errors.umsatzSollMonat.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="umsatzSollWoche">Wöchentliches Umsatzziel (€) *</Label>
                <Input
                  id="umsatzSollWoche"
                  type="number"
                  inputMode="numeric"
                  placeholder="z.B. 5000"
                  {...register("umsatzSollWoche", { valueAsNumber: true })}
                  className={`h-12 ${errors.umsatzSollWoche ? "border-destructive" : ""}`}
                />
                {errors.umsatzSollWoche && (
                  <p className="text-xs text-destructive">{errors.umsatzSollWoche.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KPIs auswählen */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Welche KPIs möchtest du tracken?</CardTitle>
              </div>
              <CardDescription>
                Wähle die Kennzahlen, die für dein Business relevant sind.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Kontakte */}
              <div className="flex items-start space-x-3 p-3 rounded-lg border bg-background">
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
                      <Label htmlFor="kontakteSoll" className="text-xs text-muted-foreground">
                        Wochenziel
                      </Label>
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
              <div className="flex items-start space-x-3 p-3 rounded-lg border bg-background">
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
                      <Label htmlFor="termineVereinbartSoll" className="text-xs text-muted-foreground">
                        Wochenziel vereinbarte Termine
                      </Label>
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
              <div className="flex items-start space-x-3 p-3 rounded-lg border bg-background">
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
                      <Label htmlFor="termineAbschlussSoll" className="text-xs text-muted-foreground">
                        Wochenziel Abschluss-Termine
                      </Label>
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
              <div className="flex items-start space-x-3 p-3 rounded-lg border bg-background">
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
                      <Label htmlFor="einheitenSoll" className="text-xs text-muted-foreground">
                        Wochenziel
                      </Label>
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
              <div className="flex items-start space-x-3 p-3 rounded-lg border bg-background">
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
                      <Label htmlFor="empfehlungenSoll" className="text-xs text-muted-foreground">
                        Wochenziel
                      </Label>
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
              <div className="flex items-start space-x-3 p-3 rounded-lg border bg-background">
                <Checkbox
                  id="trackEntscheider"
                  {...register("trackEntscheider")}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label htmlFor="trackEntscheider" className="font-medium cursor-pointer">
                    Entscheider-Quote (von Kontakten)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tracke, wie viele deiner Kontakte Entscheider sind.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full h-12" disabled={submitting || isPreview}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird gespeichert...
              </>
            ) : isPreview ? (
              "Vorschau-Modus"
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
