"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, Trophy, Euro, Phone, Calendar, Handshake, Target, Gift, Settings, Percent, TrendingUp, Package } from "lucide-react";

const kpiSetupSchema = z.object({
  // Ziel
  umsatzSollMonat: z.number().min(1, "Bitte gib ein gültiges Ziel an"),

  // KPIs
  trackKontakte: z.boolean(),
  kontakteSoll: z.number().min(1).optional().nullable(),
  trackEntscheider: z.boolean(),

  trackTermine: z.boolean(),
  termineVereinbartSoll: z.number().min(1).optional().nullable(),

  trackKonvertierung: z.boolean(),
  konvertierungTerminSoll: z.number().min(0).max(100).optional().nullable(),

  trackAbschluesse: z.boolean(),
  termineAbschlussSoll: z.number().min(1).optional().nullable(),

  trackAbschlussquote: z.boolean(),
  abschlussquoteSoll: z.number().min(0).max(100).optional().nullable(),

  trackEinheiten: z.boolean(),
  einheitenSoll: z.number().min(1).optional().nullable(),

  trackEmpfehlungen: z.boolean(),
  empfehlungenSoll: z.number().min(1).optional().nullable(),

  // Kontext & Motivation
  wasNervtAmMeisten: z.string().optional(),
  hauptzielEinSatz: z.string().min(5, "Bitte formuliere dein Ziel (mind. 5 Zeichen)"),
}).refine((data) => !data.trackKontakte || (data.kontakteSoll && data.kontakteSoll > 0), {
  message: "Bitte gib ein Ziel für Kontakte an",
  path: ["kontakteSoll"],
}).refine((data) => !data.trackTermine || (data.termineVereinbartSoll && data.termineVereinbartSoll > 0), {
  message: "Bitte gib ein Ziel für Termine an",
  path: ["termineVereinbartSoll"],
}).refine((data) => !data.trackKonvertierung || (data.konvertierungTerminSoll !== null && data.konvertierungTerminSoll !== undefined && data.konvertierungTerminSoll >= 0), {
  message: "Bitte gib ein Ziel für Konvertierung an",
  path: ["konvertierungTerminSoll"],
}).refine((data) => !data.trackAbschlussquote || (data.abschlussquoteSoll !== null && data.abschlussquoteSoll !== undefined && data.abschlussquoteSoll >= 0), {
  message: "Bitte gib ein Ziel für Abschlussquote an",
  path: ["abschlussquoteSoll"],
}).refine((data) => !data.trackEinheiten || (data.einheitenSoll && data.einheitenSoll > 0), {
  message: "Bitte gib ein Ziel für Einheiten an",
  path: ["einheitenSoll"],
}).refine((data) => !data.trackEmpfehlungen || (data.empfehlungenSoll && data.empfehlungenSoll > 0), {
  message: "Bitte gib ein Ziel für Empfehlungen an",
  path: ["empfehlungenSoll"],
});

type KpiSetupInput = z.infer<typeof kpiSetupSchema>;

interface MemberData {
  id?: string;
  vorname: string;
  nachname: string;
  email?: string;
  telefon?: string;
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
      trackKontakte: false,
      trackEntscheider: false,
      trackTermine: false,
      trackKonvertierung: false,
      trackAbschluesse: false,
      trackAbschlussquote: false,
      trackEinheiten: false,
      trackEmpfehlungen: false,
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

        // Pre-fill data if available
        if (data.member) {
          if (data.member.zielMonatsumsatz) {
            setValue("umsatzSollMonat", Number(data.member.zielMonatsumsatz));
          }
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
            Hey {memberData?.vorname}! Starte dein KPI-Tracking
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-2xl mx-auto">
            Lege fest, welche Kennzahlen du ab jetzt wöchentlich messen möchtest.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                  }}
                  className="mt-1"
                />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-red-500" />
                    <Label htmlFor="trackKontakte" className="font-semibold cursor-pointer">
                      Kontakte / Calls pro Woche tracken
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
                  onCheckedChange={(checked) => setValue("trackTermine", !!checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <Label htmlFor="trackTermine" className="font-semibold cursor-pointer">
                      Gesamttermine tracken
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
                  onCheckedChange={(checked) => setValue("trackKonvertierung", !!checked)}
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
                  onCheckedChange={(checked) => setValue("trackAbschluesse", !!checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Handshake className="h-5 w-5 text-green-600" />
                    <Label htmlFor="trackAbschluesse" className="font-semibold cursor-pointer">
                      Abschluss-Termine & No-Shows tracken
                    </Label>
                  </div>
                  {trackAbschluesse && (
                    <div className="space-y-2">
                      <Label htmlFor="termineAbschlussSoll" className="text-sm">
                        Ziel: Abschluss-Termine pro Woche
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Wie viele Abschluss-Termine planst du pro Woche? No-Shows werden automatisch
                        mit erfasst.
                      </p>
                      <Input
                        id="termineAbschlussSoll"
                        type="number"
                        inputMode="numeric"
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
                  onCheckedChange={(checked) => setValue("trackAbschlussquote", !!checked)}
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
                  onCheckedChange={(checked) => setValue("trackEinheiten", !!checked)}
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
                  onCheckedChange={(checked) => setValue("trackEmpfehlungen", !!checked)}
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

          <Button type="submit" className="w-full h-12" disabled={submitting || isPreview}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird gespeichert...
              </>
            ) : isPreview ? (
              "Vorschau-Modus"
            ) : (
              "KPI-Tracking starten"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
