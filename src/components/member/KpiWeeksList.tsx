"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeelingEmoji } from "@/components/common";
import { formatDate, formatDateTime } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  TrendingUp,
  Users,
  Calendar,
  Package,
  MessageSquare,
  Trophy,
  AlertCircle,
  Lightbulb,
  Bot,
  Clock,
  RefreshCw,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface KpiWeek {
  id: string;
  weekStart: Date;
  weekNumber: number;
  year: number;
  umsatzIst: number | null;
  kontakteIst: number | null;
  entscheiderIst: number | null;
  termineVereinbartIst: number | null;
  termineStattgefundenIst: number | null;
  termineErstIst: number | null;
  termineFolgeIst: number | null;
  termineAbschlussIst: number | null;
  termineNoshowIst: number | null;
  einheitenIst: number | null;
  empfehlungenIst: number | null;
  konvertierungTerminIst: number | null;
  abschlussquoteIst: number | null;
  feelingScore: number | null;
  heldentat: string | null;
  blockiert: string | null;
  herausforderung: string | null;
  aiFeedbackText: string | null;
  aiFeedbackGeneratedAt: Date | null;
  whatsappFeedbackSent: boolean;
  whatsappScheduledFor: Date | null;
  whatsappSentAt: Date | null;
  submittedAt: Date;
}

interface MemberTracking {
  trackKontakte: boolean;
  trackTermine: boolean;
  trackEinheiten: boolean;
  trackEmpfehlungen: boolean;
  trackEntscheider: boolean;
  trackAbschluesse: boolean;
  trackKonvertierung?: boolean;
  trackAbschlussquote?: boolean;
  umsatzSollWoche: number | null;
  kontakteSoll: number | null;
  entscheiderSoll: number | null;
  termineVereinbartSoll: number | null;
  termineStattgefundenSoll: number | null;
  termineAbschlussSoll: number | null;
  einheitenSoll: number | null;
  empfehlungenSoll: number | null;
  konvertierungTerminSoll?: number | null;
  abschlussquoteSoll?: number | null;
}

interface KpiWeeksListProps {
  kpiWeeks: KpiWeek[];
  memberTracking: MemberTracking;
}

export function KpiWeeksList({ kpiWeeks, memberTracking }: KpiWeeksListProps) {
  const [selectedKpi, setSelectedKpi] = useState<KpiWeek | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFeedback, setEditedFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return Number(value).toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    });
  };

  const formatNumber = (value: number | null) => {
    if (value === null) return "-";
    return value.toString();
  };

  const getPerformanceColor = (ist: number | null, soll: number | null) => {
    if (ist === null || soll === null || soll === 0) return "text-muted-foreground";
    const percentage = (ist / soll) * 100;
    if (percentage >= 100) return "text-green-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (kpiWeeks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Noch keine KPI-Daten vorhanden
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {kpiWeeks.map((kpi) => (
          <div
            key={kpi.id}
            onClick={() => setSelectedKpi(kpi)}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
          >
            <div>
              <p className="font-medium">
                KW {kpi.weekNumber}/{kpi.year}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(kpi.weekStart)}
              </p>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div>
                <p className="text-sm text-muted-foreground">Umsatz</p>
                <p className={`font-medium ${getPerformanceColor(kpi.umsatzIst, memberTracking.umsatzSollWoche)}`}>
                  {formatCurrency(kpi.umsatzIst)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Feeling</p>
                {kpi.feelingScore && (
                  <FeelingEmoji score={kpi.feelingScore} size="sm" />
                )}
              </div>
              {kpi.aiFeedbackText && (
                <span title="AI Feedback vorhanden">
                  <Bot className="h-4 w-4 text-primary" />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedKpi} onOpenChange={(open) => !open && setSelectedKpi(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedKpi && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>KPI Details - KW {selectedKpi.weekNumber}/{selectedKpi.year}</span>
                  {selectedKpi.feelingScore && (
                    <FeelingEmoji score={selectedKpi.feelingScore} size="md" />
                  )}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedKpi.weekStart)} · Eingereicht am {formatDate(selectedKpi.submittedAt)}
                </p>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Performance KPIs */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Performance Kennzahlen
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Umsatz - always shown */}
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Umsatz</p>
                      <p className={`text-lg font-semibold ${getPerformanceColor(selectedKpi.umsatzIst, memberTracking.umsatzSollWoche)}`}>
                        {formatCurrency(selectedKpi.umsatzIst)}
                      </p>
                      {memberTracking.umsatzSollWoche && (
                        <p className="text-xs text-muted-foreground">
                          Ziel: {formatCurrency(memberTracking.umsatzSollWoche)}
                        </p>
                      )}
                    </div>

                    {/* Kontakte */}
                    {memberTracking.trackKontakte && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> Kontakte
                        </p>
                        <p className={`text-lg font-semibold ${getPerformanceColor(selectedKpi.kontakteIst, memberTracking.kontakteSoll)}`}>
                          {formatNumber(selectedKpi.kontakteIst)}
                        </p>
                        {memberTracking.kontakteSoll && (
                          <p className="text-xs text-muted-foreground">
                            Ziel: {memberTracking.kontakteSoll}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Entscheider */}
                    {memberTracking.trackEntscheider && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> Entscheider
                        </p>
                        <p className={`text-lg font-semibold ${getPerformanceColor(selectedKpi.entscheiderIst, memberTracking.entscheiderSoll)}`}>
                          {formatNumber(selectedKpi.entscheiderIst)}
                        </p>
                        {memberTracking.entscheiderSoll && (
                          <p className="text-xs text-muted-foreground">
                            Ziel: {memberTracking.entscheiderSoll}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Termine Vereinbart */}
                    {memberTracking.trackTermine && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Termine vereinbart
                        </p>
                        <p className={`text-lg font-semibold ${getPerformanceColor(selectedKpi.termineVereinbartIst, memberTracking.termineVereinbartSoll)}`}>
                          {formatNumber(selectedKpi.termineVereinbartIst)}
                        </p>
                        {memberTracking.termineVereinbartSoll && (
                          <p className="text-xs text-muted-foreground">
                            Ziel: {memberTracking.termineVereinbartSoll}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Termine Stattgefunden */}
                    {memberTracking.trackTermine && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Termine stattgefunden
                        </p>
                        <p className={`text-lg font-semibold ${getPerformanceColor(selectedKpi.termineStattgefundenIst, memberTracking.termineStattgefundenSoll)}`}>
                          {formatNumber(selectedKpi.termineStattgefundenIst)}
                        </p>
                        {memberTracking.termineStattgefundenSoll && (
                          <p className="text-xs text-muted-foreground">
                            Ziel: {memberTracking.termineStattgefundenSoll}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Ersttermine */}
                    {memberTracking.trackTermine && selectedKpi.termineErstIst !== null && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Ersttermine
                        </p>
                        <p className="text-lg font-semibold">
                          {formatNumber(selectedKpi.termineErstIst)}
                        </p>
                      </div>
                    )}

                    {/* Folgetermine */}
                    {memberTracking.trackTermine && selectedKpi.termineFolgeIst !== null && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Folgetermine
                        </p>
                        <p className="text-lg font-semibold">
                          {formatNumber(selectedKpi.termineFolgeIst)}
                        </p>
                      </div>
                    )}

                    {/* Konvertierung (calculated) */}
                    {selectedKpi.konvertierungTerminIst !== null && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" /> Konvertierung
                        </p>
                        <p className="text-lg font-semibold text-purple-600">
                          {Number(selectedKpi.konvertierungTerminIst).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Kontakt → Termin
                          {memberTracking.konvertierungTerminSoll && (
                            <> (Ziel: {memberTracking.konvertierungTerminSoll}%)</>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Termine Abschluss */}
                    {memberTracking.trackAbschluesse && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Abschluss-Termine
                        </p>
                        <p className={`text-lg font-semibold ${getPerformanceColor(selectedKpi.termineAbschlussIst, memberTracking.termineAbschlussSoll)}`}>
                          {formatNumber(selectedKpi.termineAbschlussIst)}
                        </p>
                        {memberTracking.termineAbschlussSoll && (
                          <p className="text-xs text-muted-foreground">
                            Ziel: {memberTracking.termineAbschlussSoll}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Termine No-Show */}
                    {memberTracking.trackTermine && selectedKpi.termineNoshowIst !== null && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> No-Shows
                        </p>
                        <p className="text-lg font-semibold text-orange-600">
                          {formatNumber(selectedKpi.termineNoshowIst)}
                        </p>
                      </div>
                    )}

                    {/* Abschlussquote (calculated) */}
                    {selectedKpi.abschlussquoteIst !== null && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" /> Abschlussquote
                        </p>
                        <p className="text-lg font-semibold text-green-600">
                          {Number(selectedKpi.abschlussquoteIst).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Termin → Abschluss
                          {memberTracking.abschlussquoteSoll && (
                            <> (Ziel: {memberTracking.abschlussquoteSoll}%)</>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Einheiten */}
                    {memberTracking.trackEinheiten && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" /> Einheiten
                        </p>
                        <p className={`text-lg font-semibold ${getPerformanceColor(selectedKpi.einheitenIst, memberTracking.einheitenSoll)}`}>
                          {formatNumber(selectedKpi.einheitenIst)}
                        </p>
                        {memberTracking.einheitenSoll && (
                          <p className="text-xs text-muted-foreground">
                            Ziel: {memberTracking.einheitenSoll}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Empfehlungen */}
                    {memberTracking.trackEmpfehlungen && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> Empfehlungen
                        </p>
                        <p className={`text-lg font-semibold ${getPerformanceColor(selectedKpi.empfehlungenIst, memberTracking.empfehlungenSoll)}`}>
                          {formatNumber(selectedKpi.empfehlungenIst)}
                        </p>
                        {memberTracking.empfehlungenSoll && (
                          <p className="text-xs text-muted-foreground">
                            Ziel: {memberTracking.empfehlungenSoll}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reflexion */}
                {(selectedKpi.heldentat || selectedKpi.blockiert || selectedKpi.herausforderung) && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Reflexion
                    </h3>
                    <div className="space-y-3">
                      {selectedKpi.heldentat && (
                        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                          <p className="text-xs text-green-700 font-medium flex items-center gap-1 mb-1">
                            <Trophy className="h-3 w-3" /> Heldentat der Woche
                          </p>
                          <p className="text-sm text-green-800">{selectedKpi.heldentat}</p>
                        </div>
                      )}
                      {selectedKpi.blockiert && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                          <p className="text-xs text-red-700 font-medium flex items-center gap-1 mb-1">
                            <AlertCircle className="h-3 w-3" /> Was hat blockiert?
                          </p>
                          <p className="text-sm text-red-800">{selectedKpi.blockiert}</p>
                        </div>
                      )}
                      {selectedKpi.herausforderung && (
                        <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                          <p className="text-xs text-orange-700 font-medium flex items-center gap-1 mb-1">
                            <Lightbulb className="h-3 w-3" /> Größte Herausforderung
                          </p>
                          <p className="text-sm text-orange-800">{selectedKpi.herausforderung}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Feedback */}
                {selectedKpi.aiFeedbackText && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      KI-Feedback
                      {!selectedKpi.whatsappFeedbackSent && (
                        <Badge variant="outline" className="text-xs ml-2">
                          Bearbeitbar
                        </Badge>
                      )}
                    </h3>
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      {isEditing ? (
                        <div className="space-y-3">
                          {selectedKpi.whatsappScheduledFor && (
                            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm flex items-center gap-2">
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              <span>
                                <strong>Geplanter WhatsApp-Versand:</strong>{" "}
                                {formatDateTime(selectedKpi.whatsappScheduledFor)}
                              </span>
                            </div>
                          )}
                          <Textarea
                            value={editedFeedback}
                            onChange={(e) => setEditedFeedback(e.target.value)}
                            className="min-h-[200px] text-sm"
                            placeholder="Feedback-Text eingeben..."
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsEditing(false);
                                setEditedFeedback("");
                              }}
                              disabled={saving}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Abbrechen
                            </Button>
                            <Button
                              size="sm"
                              disabled={saving || !editedFeedback.trim()}
                              onClick={async () => {
                                try {
                                  setSaving(true);
                                  const res = await fetch(
                                    `/api/kpi-weeks/${selectedKpi.id}/update-feedback`,
                                    {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ feedback: editedFeedback }),
                                    }
                                  );
                                  const data = await res.json().catch(() => ({}));

                                  if (!res.ok) {
                                    toast.error(
                                      data?.error || "Konnte Feedback nicht speichern"
                                    );
                                    return;
                                  }

                                  const updated = data.kpiWeek;
                                  setSelectedKpi((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          aiFeedbackText: updated.aiFeedbackText ?? prev.aiFeedbackText,
                                          aiFeedbackGeneratedAt: updated.aiFeedbackGeneratedAt
                                            ? new Date(updated.aiFeedbackGeneratedAt)
                                            : prev.aiFeedbackGeneratedAt,
                                        }
                                      : prev
                                  );
                                  setIsEditing(false);
                                  setEditedFeedback("");
                                  toast.success("Feedback wurde gespeichert");
                                } catch {
                                  toast.error("Konnte Feedback nicht speichern");
                                } finally {
                                  setSaving(false);
                                }
                              }}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              {saving ? "Speichern..." : "Speichern"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap">{selectedKpi.aiFeedbackText}</p>
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-primary/10 text-xs text-muted-foreground">
                            {selectedKpi.aiFeedbackGeneratedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Generiert: {formatDate(selectedKpi.aiFeedbackGeneratedAt)}
                              </span>
                            )}
                            {selectedKpi.whatsappFeedbackSent ? (
                              <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                WhatsApp gesendet
                                {selectedKpi.whatsappSentAt && ` (${formatDateTime(selectedKpi.whatsappSentAt)})`}
                              </Badge>
                            ) : selectedKpi.whatsappScheduledFor && (
                              <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700">
                                <Clock className="h-3 w-3 mr-1" />
                                Geplanter Versand: {formatDateTime(selectedKpi.whatsappScheduledFor)}
                              </Badge>
                            )}
                          </div>

                          {!selectedKpi.whatsappFeedbackSent && (
                            <div className="mt-3 flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditedFeedback(selectedKpi.aiFeedbackText || "");
                                  setIsEditing(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Bearbeiten
                              </Button>
                              {selectedKpi.whatsappScheduledFor && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={regenerating}
                                  onClick={async () => {
                                    try {
                                      setRegenerating(true);
                                      const res = await fetch(
                                        `/api/kpi-weeks/${selectedKpi.id}/regenerate-ai-feedback`,
                                        { method: "POST" }
                                      );
                                      const data = await res.json().catch(() => ({}));

                                      if (!res.ok) {
                                        toast.error(
                                          data?.message ||
                                            data?.error ||
                                            "Konnte KI-Feedback nicht neu erstellen"
                                        );
                                        return;
                                      }

                                      const updated = data.kpiWeek;
                                      setSelectedKpi((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              aiFeedbackText: updated.aiFeedbackText ?? prev.aiFeedbackText,
                                              aiFeedbackGeneratedAt: updated.aiFeedbackGeneratedAt
                                                ? new Date(updated.aiFeedbackGeneratedAt)
                                                : prev.aiFeedbackGeneratedAt,
                                              whatsappScheduledFor: updated.whatsappScheduledFor
                                                ? new Date(updated.whatsappScheduledFor)
                                                : prev.whatsappScheduledFor,
                                            }
                                          : prev
                                      );

                                      toast.success(
                                        "KI-Feedback wurde neu erstellt und neu geplant"
                                      );
                                    } catch {
                                      toast.error("Konnte KI-Feedback nicht neu erstellen");
                                    } finally {
                                      setRegenerating(false);
                                    }
                                  }}
                                >
                                  <RefreshCw
                                    className={`h-4 w-4 mr-2 ${regenerating ? "animate-spin" : ""}`}
                                  />
                                  Neu erstellen
                                </Button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* No AI Feedback yet */}
                {!selectedKpi.aiFeedbackText && (
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Noch kein KI-Feedback generiert
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
