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
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

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
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Vielen Dank!</h2>
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
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <svg
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
            >
              <path
                d="M20 5L35 15V25L20 35L5 25V15L20 5Z"
                fill="#dc2626"
              />
              <path d="M12 18L20 12L28 18L20 24L12 18Z" fill="white" />
              <path d="M20 24V32" stroke="white" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Dein Weekly KPI-Update</h1>
          <p className="text-muted-foreground mt-1">
            Hallo {memberData?.vorname}! Trage deine Zahlen für diese Woche ein.
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
              <CardTitle className="text-base">Umsatz</CardTitle>
              <CardDescription>
                {memberData?.umsatzSollWoche && (
                  <>
                    Dein Wochenziel:{" "}
                    {Number(memberData.umsatzSollWoche).toLocaleString("de-DE", {
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
                  step="0.01"
                  {...register("umsatzIst", { valueAsNumber: true })}
                  className={errors.umsatzIst ? "border-destructive" : ""}
                />
                {errors.umsatzIst && (
                  <p className="text-xs text-destructive">
                    {errors.umsatzIst.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dynamic KPI Fields */}
          {(memberData?.trackKontakte || memberData?.trackEntscheider || memberData?.trackTermine || memberData?.trackAbschluesse) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aktivitäten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {memberData?.trackKontakte && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="kontakteIst">Kontakte</Label>
                      <Input
                        id="kontakteIst"
                        type="number"
                        {...register("kontakteIst", { valueAsNumber: true })}
                      />
                    </div>
                    {memberData?.trackEntscheider && (
                      <div className="space-y-2">
                        <Label htmlFor="entscheiderIst">Davon Entscheider</Label>
                        <Input
                          id="entscheiderIst"
                          type="number"
                          {...register("entscheiderIst", { valueAsNumber: true })}
                        />
                      </div>
                    )}
                  </div>
                )}

                {memberData?.trackTermine && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="termineVereinbartIst">
                        Termine vereinbart
                      </Label>
                      <Input
                        id="termineVereinbartIst"
                        type="number"
                        {...register("termineVereinbartIst", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="termineStattgefundenIst">
                        Termine stattgefunden
                      </Label>
                      <Input
                        id="termineStattgefundenIst"
                        type="number"
                        {...register("termineStattgefundenIst", { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                )}

                {memberData?.trackAbschluesse && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="termineAbschlussIst">
                        Abschluss-Termine
                      </Label>
                      <Input
                        id="termineAbschlussIst"
                        type="number"
                        {...register("termineAbschlussIst", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="termineNoshowIst">No-Shows</Label>
                      <Input
                        id="termineNoshowIst"
                        type="number"
                        {...register("termineNoshowIst", { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Additional KPIs */}
          {(memberData?.trackEinheiten || memberData?.trackEmpfehlungen) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weitere KPIs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {memberData?.trackEinheiten && (
                    <div className="space-y-2">
                      <Label htmlFor="einheitenIst">Einheiten</Label>
                      <Input
                        id="einheitenIst"
                        type="number"
                        {...register("einheitenIst", { valueAsNumber: true })}
                      />
                    </div>
                  )}
                  {memberData?.trackEmpfehlungen && (
                    <div className="space-y-2">
                      <Label htmlFor="empfehlungenIst">Empfehlungen</Label>
                      <Input
                        id="empfehlungenIst"
                        type="number"
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
              <CardTitle className="text-base">Wie fühlst du dich?</CardTitle>
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
                  <span>1 - Schlecht</span>
                  <span className="text-2xl font-bold text-foreground">
                    {feelingScore}
                  </span>
                  <span>10 - Fantastisch</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reflection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reflexion</CardTitle>
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

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
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
      </div>
    </div>
  );
}
