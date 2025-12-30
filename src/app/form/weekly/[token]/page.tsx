"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { weeklyKpiFormSchema, type WeeklyKpiFormInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, Euro, Phone, Calendar, Target, Gift, Heart, MessageSquare, Handshake } from "lucide-react";

interface MemberData {
  id: string;
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
  termineAbschlussSoll: number | null;
  einheitenSoll: number | null;
  empfehlungenSoll: number | null;
}

export default function WeeklyKpiFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [feelingScore, setFeelingScore] = useState(5);
  const [token, setToken] = useState<string>("");
  const [isPreview, setIsPreview] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WeeklyKpiFormInput>({
    resolver: zodResolver(weeklyKpiFormSchema),
    defaultValues: {
      feelingScore: 5,
    },
  });

  useEffect(() => {
    async function loadData() {
      const resolvedParams = await params;
      setToken(resolvedParams.token);

      try {
        const response = await fetch(`/api/forms/weekly/${resolvedParams.token}`);
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

  const onSubmit = async (data: WeeklyKpiFormInput) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/forms/weekly/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, feelingScore }),
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
            <h2 className="text-xl font-semibold mb-2">Vielen Dank, {memberData?.vorname}!</h2>
            <p className="text-muted-foreground">
              Deine KPIs wurden erfolgreich gespeichert. Du erhältst in Kürze
              dein persönliches Feedback.
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
            src="/kpiweeklytracking_banner.jpeg"
            alt="NF Mentoring Weekly KPI-Tracking"
            className="w-full h-auto object-cover"
          />
        </div>

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold">
            Hey {memberData?.vorname}!
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Zeit für dein Weekly Update – trage deine Zahlen für diese Woche ein.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                {memberData?.umsatzSollWoche ? (
                  <>
                    Dein Wochenziel:{" "}
                    <span className="font-semibold text-foreground">
                      {Number(memberData.umsatzSollWoche).toLocaleString("de-DE", {
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
                  className={`h-12 text-lg ${errors.umsatzIst ? "border-destructive" : ""}`}
                  placeholder="0"
                  {...register("umsatzIst", { valueAsNumber: true })}
                />
                {errors.umsatzIst && (
                  <p className="text-xs text-destructive">
                    {errors.umsatzIst.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Kontakte Section */}
          {memberData?.trackKontakte && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-red-500" />
                  <CardTitle className="text-base">Kontakte</CardTitle>
                </div>
                <CardDescription>
                  {memberData?.kontakteSoll ? (
                    <>
                      Dein Wochenziel:{" "}
                      <span className="font-semibold text-foreground">
                        {memberData.kontakteSoll} Kontakte
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
                      {...register("kontakteIst", { valueAsNumber: true })}
                    />
                  </div>
                  {memberData?.trackEntscheider && (
                    <div className="space-y-2">
                      <Label htmlFor="entscheiderIst">Davon Entscheider</Label>
                      <Input
                        id="entscheiderIst"
                        type="number"
                        inputMode="numeric"
                        className="h-12"
                        placeholder="0"
                        {...register("entscheiderIst", { valueAsNumber: true })}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Termine Section */}
          {memberData?.trackTermine && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Termine</CardTitle>
                </div>
                <CardDescription>
                  {memberData?.termineVereinbartSoll ? (
                    <>
                      Dein Wochenziel:{" "}
                      <span className="font-semibold text-foreground">
                        {memberData.termineVereinbartSoll} Termine
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
                      {...register("termineVereinbartIst", { valueAsNumber: true })}
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
                      {...register("termineStattgefundenIst", { valueAsNumber: true })}
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
                      {...register("termineErstIst", { valueAsNumber: true })}
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
                      {...register("termineFolgeIst", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Abschlüsse Section */}
          {memberData?.trackAbschluesse && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Handshake className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base">Abschlüsse</CardTitle>
                </div>
                <CardDescription>
                  {memberData?.termineAbschlussSoll ? (
                    <>
                      Dein Wochenziel:{" "}
                      <span className="font-semibold text-foreground">
                        {memberData.termineAbschlussSoll} Abschluss-Termine
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
                      {...register("termineAbschlussIst", { valueAsNumber: true })}
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
                      {...register("termineNoshowIst", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weitere KPIs */}
          {(memberData?.trackEinheiten || memberData?.trackEmpfehlungen) && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-base">Weitere KPIs</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {memberData?.trackEinheiten && (
                    <div className="space-y-2">
                      <Label htmlFor="einheitenIst">
                        Einheiten
                        {memberData?.einheitenSoll && (
                          <span className="text-muted-foreground font-normal ml-1">
                            (Ziel: {memberData.einheitenSoll})
                          </span>
                        )}
                      </Label>
                      <Input
                        id="einheitenIst"
                        type="number"
                        inputMode="numeric"
                        className="h-12"
                        placeholder="0"
                        {...register("einheitenIst", { valueAsNumber: true })}
                      />
                    </div>
                  )}
                  {memberData?.trackEmpfehlungen && (
                    <div className="space-y-2">
                      <Label htmlFor="empfehlungenIst">
                        <div className="flex items-center gap-1">
                          <Gift className="h-4 w-4 text-amber-500" />
                          Empfehlungen
                          {memberData?.empfehlungenSoll && (
                            <span className="text-muted-foreground font-normal ml-1">
                              (Ziel: {memberData.empfehlungenSoll})
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
                        {...register("empfehlungenIst", { valueAsNumber: true })}
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
                Bewerte deine Woche auf einer Skala von 1 (schlecht) bis 10
                (fantastisch)
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
                  <span className="text-2xl font-bold text-foreground">
                    {feelingScore}
                  </span>
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
                  {...register("heldentat")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blockiert">
                  Was hat dich diese Woche blockiert?
                </Label>
                <Textarea
                  id="blockiert"
                  placeholder="Gab es Herausforderungen oder Hindernisse?"
                  {...register("blockiert")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="herausforderung">
                  Was ist deine größte Herausforderung für nächste Woche?
                </Label>
                <Textarea
                  id="herausforderung"
                  placeholder="Worauf möchtest du dich fokussieren?"
                  {...register("herausforderung")}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full h-12 text-base" disabled={submitting || isPreview}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird gespeichert...
              </>
            ) : isPreview ? (
              "Vorschau-Modus"
            ) : (
              "KPIs absenden"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
