"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, ArrowRight, ArrowLeft } from "lucide-react";

// Zod 4 compatible helper with explicit type predicate for correct inference
// NaN from empty number inputs triggers validation error
const numericField = (minValue: number, errorMessage: string) =>
  z
    .union([z.number(), z.nan()])
    .refine((val): val is number => typeof val === 'number' && !Number.isNaN(val), { message: errorMessage })
    .refine((val) => val >= minValue, { message: errorMessage });

const onboardingSchema = z.object({
  unternehmen: z.string().min(1, "Bitte gib dein Unternehmen an"),
  position: z.string().min(1, "Bitte gib deine Position an"),
  aktuellerMonatsumsatz: numericField(0, "Bitte gib einen gültigen Umsatz an"),
  wasNervtAmMeisten: z.string().min(10, "Bitte beschreibe ausführlicher (mind. 10 Zeichen)"),
  groessetesProblem: z.string().min(10, "Bitte beschreibe ausführlicher (mind. 10 Zeichen)"),
  zielMonatsumsatz: numericField(1, "Bitte gib ein gültiges Ziel an (mindestens 1€)"),
  groessteZielWarum: z.string().min(10, "Bitte beschreibe ausführlicher (mind. 10 Zeichen)"),
  wieAufmerksam: z.string().optional(),
});

type OnboardingInput = z.infer<typeof onboardingSchema>;

interface MemberData {
  vorname: string;
  nachname: string;
}

export default function OnboardingFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [step, setStep] = useState(1);
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
    trigger,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
  });

  useEffect(() => {
    async function loadData() {
      const resolvedParams = await params;
      setToken(resolvedParams.token);

      try {
        const response = await fetch(`/api/forms/onboarding/${resolvedParams.token}`);
        if (!response.ok) {
          throw new Error("Token ungültig oder abgelaufen");
        }
        const data = await response.json();
        setMemberData(data.member);
        setIsPreview(data.isPreview || false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params]);

  const nextStep = async () => {
    let fieldsToValidate: (keyof OnboardingInput)[] = [];
    if (step === 1) {
      fieldsToValidate = ["unternehmen", "position", "aktuellerMonatsumsatz"];
    } else if (step === 2) {
      fieldsToValidate = ["wasNervtAmMeisten", "groessetesProblem"];
    }

    const valid = await trigger(fieldsToValidate);
    if (valid) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const onSubmit = async (data: OnboardingInput) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/forms/onboarding/${token}`, {
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
            <h2 className="text-xl font-semibold mb-2">Willkommen im NF Mentoring!</h2>
            <p className="text-muted-foreground mb-4">
              Deine Daten wurden erfolgreich gespeichert. Wir freuen uns auf die
              Zusammenarbeit mit dir, {memberData?.vorname}!
            </p>
            <p className="text-sm text-muted-foreground">
              Du erhältst in Kürze weitere Informationen per E-Mail.
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

        {/* Banner */}
        <div className="rounded-xl overflow-hidden mb-6 shadow-lg">
          <img
            src="/onboarding_banner.jpeg"
            alt="NF Mentoring Onboarding"
            className="w-full h-auto object-cover"
          />
        </div>

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold">Starte jetzt dein NF Mentoring</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Hallo {memberData?.vorname}! Erzähl uns mehr über dich.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step
                  ? "w-8 bg-primary"
                  : s < step
                  ? "w-2 bg-primary"
                  : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Über dich */}
          {step === 1 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Über dich</CardTitle>
                <CardDescription>
                  Erzähl uns etwas über dein Unternehmen und deine aktuelle Situation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="unternehmen">Unternehmen / Firma *</Label>
                  <Input
                    id="unternehmen"
                    placeholder="z.B. Mustermann Finanzberatung"
                    {...register("unternehmen")}
                    className={`h-12 ${errors.unternehmen ? "border-destructive" : ""}`}
                  />
                  {errors.unternehmen && (
                    <p className="text-xs text-destructive">{errors.unternehmen.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Deine Position *</Label>
                  <Input
                    id="position"
                    placeholder="z.B. Geschäftsführer, Berater"
                    {...register("position")}
                    className={`h-12 ${errors.position ? "border-destructive" : ""}`}
                  />
                  {errors.position && (
                    <p className="text-xs text-destructive">{errors.position.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aktuellerMonatsumsatz">
                    Aktueller Monatsumsatz (€) *
                  </Label>
                  <Input
                    id="aktuellerMonatsumsatz"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="z.B. 15000"
                    {...register("aktuellerMonatsumsatz", { valueAsNumber: true })}
                    className={`h-12 ${errors.aktuellerMonatsumsatz ? "border-destructive" : ""}`}
                  />
                  {errors.aktuellerMonatsumsatz && (
                    <p className="text-xs text-destructive">
                      {errors.aktuellerMonatsumsatz.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Herausforderungen */}
          {step === 2 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Deine Herausforderungen</CardTitle>
                <CardDescription>
                  Was möchtest du mit dem Mentoring erreichen?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wasNervtAmMeisten">
                    Was nervt dich aktuell am meisten in deinem Business? *
                  </Label>
                  <Textarea
                    id="wasNervtAmMeisten"
                    placeholder="Beschreibe, was dich am meisten frustriert..."
                    rows={4}
                    {...register("wasNervtAmMeisten")}
                    className={errors.wasNervtAmMeisten ? "border-destructive" : ""}
                  />
                  {errors.wasNervtAmMeisten && (
                    <p className="text-xs text-destructive">
                      {errors.wasNervtAmMeisten.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groessetesProblem">
                    Was ist dein größtes Problem, das du lösen möchtest? *
                  </Label>
                  <Textarea
                    id="groessetesProblem"
                    placeholder="Beschreibe dein Hauptproblem..."
                    rows={4}
                    {...register("groessetesProblem")}
                    className={errors.groessetesProblem ? "border-destructive" : ""}
                  />
                  {errors.groessetesProblem && (
                    <p className="text-xs text-destructive">
                      {errors.groessetesProblem.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Ziele */}
          {step === 3 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Deine Ziele</CardTitle>
                <CardDescription>
                  Wo möchtest du hin?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="zielMonatsumsatz">Dein Ziel-Monatsumsatz (€) *</Label>
                  <Input
                    id="zielMonatsumsatz"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="z.B. 30000"
                    {...register("zielMonatsumsatz", { valueAsNumber: true })}
                    className={`h-12 ${errors.zielMonatsumsatz ? "border-destructive" : ""}`}
                  />
                  {errors.zielMonatsumsatz && (
                    <p className="text-xs text-destructive">
                      {errors.zielMonatsumsatz.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groessteZielWarum">
                    Warum ist dir dieses Ziel so wichtig? *
                  </Label>
                  <Textarea
                    id="groessteZielWarum"
                    placeholder="Was verändert sich für dich, wenn du dieses Ziel erreichst?"
                    rows={4}
                    {...register("groessteZielWarum")}
                    className={errors.groessteZielWarum ? "border-destructive" : ""}
                  />
                  {errors.groessteZielWarum && (
                    <p className="text-xs text-destructive">
                      {errors.groessteZielWarum.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wieAufmerksam">
                    Wie bist du auf NF Mentoring aufmerksam geworden?
                  </Label>
                  <Input
                    id="wieAufmerksam"
                    placeholder="z.B. Empfehlung, Social Media, ..."
                    {...register("wieAufmerksam")}
                    className="h-12"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="flex-1 h-12"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
            )}

            {step < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="flex-1 h-12"
              >
                Weiter
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex-1 h-12"
                disabled={submitting || isPreview}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gespeichert...
                  </>
                ) : isPreview ? (
                  "Vorschau-Modus"
                ) : (
                  "Absenden"
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
