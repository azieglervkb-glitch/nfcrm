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
import { Loader2, CheckCircle, AlertCircle, X, Trophy, DollarSign, Phone, Calendar, TrendingUp, Handshake, Target, Award, Lightbulb, Settings } from "lucide-react";

const kpiSetupSchema = z.object({
  // Persönliche Daten
  id: z.string().optional(),
  vorname: z.string().min(1, "Vorname ist erforderlich"),
  nachname: z.string().min(1, "Nachname ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  telefon: z.string().optional(),
  
  // Ziel
  umsatzSollMonat: z.number().min(0, "Bitte gib ein gültiges Ziel an"),
  
  // KPIs
  trackKontakte: z.boolean(),
  kontakteSoll: z.number().optional(),
  
  trackTermine: z.boolean(),
  termineVereinbartSoll: z.number().optional(),
  
  trackKonvertierung: z.boolean(),
  konvertierungTerminSoll: z.number().min(0).max(100).optional(),
  
  trackAbschlussquote: z.boolean(),
  abschlussquoteSoll: z.number().min(0).max(100).optional(),
  
  trackEinheiten: z.boolean(),
  einheitenSoll: z.number().optional(),
  
  trackEmpfehlungen: z.boolean(),
  empfehlungenSoll: z.number().optional(),
  
  // Kontext & Motivation
  wasNervtAmMeisten: z.string().optional(),
  hauptzielEinSatz: z.string().min(5, "Bitte formuliere dein Ziel (mind. 5 Zeichen)"),
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
      trackTermine: false,
      trackKonvertierung: false,
      trackAbschlussquote: false,
      trackEinheiten: false,
      trackEmpfehlungen: false,
    },
  });

  const trackKontakte = watch("trackKontakte");
  const trackTermine = watch("trackTermine");
  const trackKonvertierung = watch("trackKonvertierung");
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
          if (data.member.vorname) setValue("vorname", data.member.vorname);
          if (data.member.nachname) setValue("nachname", data.member.nachname);
          if (data.member.email) setValue("email", data.member.email);
          if (data.member.telefon) setValue("telefon", data.member.telefon);
          if (data.member.id) setValue("id", data.member.id);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-red-900 to-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error && !memberData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-red-900 to-black p-4">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-red-900 to-black p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">KPI-Tracking aktiviert! 🚀</h2>
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-gray-900 via-red-900 to-black">
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="text-red-500 text-2xl font-bold">N</div>
          <X className="h-5 w-5 text-white cursor-pointer" />
        </div>
        <div className="pt-20 pb-12 px-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Starte dein persönliches KPI-Tracking 🚀
          </h1>
          <p className="text-gray-200 max-w-2xl mx-auto text-sm sm:text-base">
            Dieses Formular aktiviert dein persönliches KPI-Tracking. Hier legst du fest, welche
            Kennzahlen du ab jetzt wöchentlich messen möchtest – und mit welchen Zielwerten du
            arbeitest.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* So funktioniert's */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="font-semibold mb-3">So funktioniert's:</h2>
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li>• Fülle das Formular einmal aus, um dein Tracking zu starten.</li>
              <li>
                • Du kannst es später jederzeit erneut absenden, wenn sich deine Ziele oder KPIs
                ändern.
              </li>
              <li>
                • Nur aktivierte KPIs (mit Häkchen) werden in deinem wöchentlichen Formular
                abgefragt.
              </li>
            </ul>
            <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg">
              <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                <strong>Tipp:</strong> Setze lieber wenige, aber aussagekräftige KPIs – und bleib
                konsequent dabei.
              </p>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Persönliche Daten */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <CardTitle>Persönliche Daten</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="id">ID</Label>
                <Input id="id" {...register("id")} placeholder="ID" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vorname">Vorname</Label>
                <Input
                  id="vorname"
                  {...register("vorname")}
                  placeholder="Hilfetext hinzufügen"
                  className={errors.vorname ? "border-destructive" : ""}
                />
                {errors.vorname && (
                  <p className="text-xs text-destructive">{errors.vorname.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nachname">
                  Nachname <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nachname"
                  {...register("nachname")}
                  placeholder="Hilfetext hinzufügen"
                  className={errors.nachname ? "border-destructive" : ""}
                />
                {errors.nachname && (
                  <p className="text-xs text-destructive">{errors.nachname.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="Hilfetext hinzufügen"
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefon">Telefonnummer</Label>
                <p className="text-xs text-muted-foreground">
                  Wird benötigt, um mit dir ins 1 zu 1 Sparring zu gehen. Bitte achte darauf,
                  dass du eine WhatsApp fähige Nummer im Format +49XXXXXXXXXX angibst.
                </p>
                <Input
                  id="telefon"
                  {...register("telefon")}
                  placeholder="+49XXXXXXXXXX"
                />
              </div>
            </CardContent>
          </Card>

          {/* Dein Ziel */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <CardTitle>Dein Ziel</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="umsatzSollMonat">Dein monatliches Umsatzziel</Label>
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
                  onCheckedChange={(checked) => setValue("trackKontakte", !!checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-red-500" />
                    <Label htmlFor="trackKontakte" className="font-semibold cursor-pointer">
                      Kontakte / Calls pro Woche tracken
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kontakteSoll" className="text-sm">
                      Ziel - Kontakte pro Woche (Calls, Anschreiben etc.){" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Setze dir ein realistisches aber ambitioniertes Ziel. Beispiel: 20 Calls/Tag
                      * 5 Tage = 100 Calls/Woche. Wenn du dir unsicher bist, frage Nino.
                    </p>
                    {trackKontakte && (
                      <Input
                        id="kontakteSoll"
                        type="number"
                        inputMode="numeric"
                        {...register("kontakteSoll", { valueAsNumber: true })}
                        placeholder="z.B. 100"
                        className={errors.kontakteSoll ? "border-destructive" : ""}
                      />
                    )}
                  </div>
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
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <Label htmlFor="trackTermine" className="font-semibold cursor-pointer">
                      Gesamttermine tracken
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="termineVereinbartSoll" className="text-sm">
                      Ziel: Termine pro Woche <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Setze dir ein realistisches aber ambitioniertes Ziel. Terminanzahl = alle
                      Termine (Erstgespräch, Abschluss, Service-Termine etc.)
                    </p>
                    {trackTermine && (
                      <Input
                        id="termineVereinbartSoll"
                        type="number"
                        inputMode="numeric"
                        {...register("termineVereinbartSoll", { valueAsNumber: true })}
                        placeholder="z.B. 15"
                        className={errors.termineVereinbartSoll ? "border-destructive" : ""}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Konvertierung */}
              <div className="flex items-start gap-3 p-4 rounded-lg border">
                <Checkbox
                  id="trackKonvertierung"
                  checked={trackKonvertierung}
                  onCheckedChange={(checked) => setValue("trackKonvertierung", !!checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-gray-500" />
                    <Label htmlFor="trackKonvertierung" className="font-semibold cursor-pointer">
                      Konvertierung → Termin tracken
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="konvertierungTerminSoll" className="text-sm">
                      Ziel: Kontakt → Termin (%) <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Setze dir ein realistisches aber ambitioniertes Ziel. Bestandskunden: 30%,
                      Kaltakquise: 10%, realistischer Durchschnitt für beides.
                    </p>
                    {trackKonvertierung && (
                      <Input
                        id="konvertierungTerminSoll"
                        type="number"
                        inputMode="numeric"
                        step="0.1"
                        {...register("konvertierungTerminSoll", { valueAsNumber: true })}
                        placeholder="z.B. 20"
                        className={errors.konvertierungTerminSoll ? "border-destructive" : ""}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Abschlussquote */}
              <div className="flex items-start gap-3 p-4 rounded-lg border">
                <Checkbox
                  id="trackAbschlussquote"
                  checked={trackAbschlussquote}
                  onCheckedChange={(checked) => setValue("trackAbschlussquote", !!checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Handshake className="h-5 w-5 text-gray-500" />
                    <Label htmlFor="trackAbschlussquote" className="font-semibold cursor-pointer">
                      Abschlussquote tracken
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="abschlussquoteSoll" className="text-sm">
                      Ziel: Termin → Abschluss (%) <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Wie viele deiner qualifizierten Termine sollen zu einem Abschluss führen?
                      (inkl. Cross-Sell, Upsell) Beispiel: 15 Gesamttermine, 10 qualifiziert, 5
                      Abschlüsse gewünscht = 50% Ziel (5/10=0.5)
                    </p>
                    {trackAbschlussquote && (
                      <Input
                        id="abschlussquoteSoll"
                        type="number"
                        inputMode="numeric"
                        step="0.1"
                        {...register("abschlussquoteSoll", { valueAsNumber: true })}
                        placeholder="z.B. 50"
                        className={errors.abschlussquoteSoll ? "border-destructive" : ""}
                      />
                    )}
                  </div>
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
                    <Target className="h-5 w-5 text-gray-500" />
                    <Label htmlFor="trackEinheiten" className="font-semibold cursor-pointer">
                      Einheiten / Punkte tracken
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="einheitenSoll" className="text-sm">
                      Ziel: Einheiten / Punkte <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Wenn du zusätzlich zum Umsatz auch Punkte/Einheiten für dein Unternehmen
                      erreichen möchtest, finde hier ein ambitioniertes Ziel.
                    </p>
                    {trackEinheiten && (
                      <Input
                        id="einheitenSoll"
                        type="number"
                        inputMode="numeric"
                        {...register("einheitenSoll", { valueAsNumber: true })}
                        placeholder="z.B. 10"
                        className={errors.einheitenSoll ? "border-destructive" : ""}
                      />
                    )}
                  </div>
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
                    <Award className="h-5 w-5 text-gray-500" />
                    <Label htmlFor="trackEmpfehlungen" className="font-semibold cursor-pointer">
                      Empfehlungen tracken
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="empfehlungenSoll" className="text-sm">
                      Ziel: Empfehlungen pro Woche <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Wie viele Empfehlungen willst du pro Woche generieren?
                    </p>
                    {trackEmpfehlungen && (
                      <Input
                        id="empfehlungenSoll"
                        type="number"
                        inputMode="numeric"
                        {...register("empfehlungenSoll", { valueAsNumber: true })}
                        placeholder="z.B. 3"
                        className={errors.empfehlungenSoll ? "border-destructive" : ""}
                      />
                    )}
                  </div>
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
