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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3,
  Target,
  User,
  Home,
  Loader2,
  TrendingUp,
  Calendar,
  ChevronRight,
  Trophy,
  AlertCircle,
  Lightbulb,
} from "lucide-react";

interface KpiWeek {
  id: string;
  weekStart: string;
  weekNumber: number;
  year: number;
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
}

interface MemberData {
  vorname: string;
  nachname: string;
  umsatzSollWoche: number | null;
  trackKontakte: boolean;
  trackTermine: boolean;
  trackEinheiten: boolean;
  trackEmpfehlungen: boolean;
  trackEntscheider: boolean;
  trackAbschluesse: boolean;
}

export default function KpiVerlaufPage() {
  const params = useParams();
  const memberId = params.memberId as string;

  const [member, setMember] = useState<MemberData | null>(null);
  const [kpiWeeks, setKpiWeeks] = useState<KpiWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKpi, setSelectedKpi] = useState<KpiWeek | null>(null);

  useEffect(() => {
    if (memberId) {
      fetchKpiHistory();
    }
  }, [memberId]);

  const fetchKpiHistory = async () => {
    try {
      const response = await fetch(`/api/member/kpi/history?memberId=${memberId}`);
      if (response.ok) {
        const result = await response.json();
        setMember(result.member);
        setKpiWeeks(result.kpiWeeks);
      }
    } catch (error) {
      console.error("Failed to fetch KPI history:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return Number(value).toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    });
  };

  const getFeelingEmoji = (score: number | null) => {
    if (!score) return null;
    if (score <= 3) return "😔";
    if (score <= 5) return "😐";
    if (score <= 7) return "🙂";
    if (score <= 9) return "😊";
    return "🤩";
  };

  const getPerformanceColor = (ist: number | null, soll: number | null) => {
    if (ist === null || soll === null || soll === 0) return "text-gray-600";
    const percentage = (ist / soll) * 100;
    if (percentage >= 100) return "text-green-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const navItems = [
    { href: `/member/${memberId}`, icon: Home, label: "Dashboard" },
    { href: `/member/${memberId}/kpi`, icon: BarChart3, label: "KPI Tracking" },
    { href: `/member/${memberId}/ziele`, icon: Target, label: "Meine Ziele" },
    { href: `/member/${memberId}/profil`, icon: User, label: "Profil" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center md:justify-between h-16">
            <div className="flex items-center gap-8">
              <img src="/nf-logo.png" alt="NF Mentoring" className="h-8 w-auto" />
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      item.href.includes("/kpi")
                        ? "text-red-600 bg-red-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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
                item.href.includes("/kpi") ? "text-red-600" : "text-gray-600"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Dein KPI-Verlauf</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Alle deine eingetragenen Wochen im Überblick
              </p>
            </div>
            <Link href={`/member/${memberId}/kpi`}>
              <Button className="bg-red-600 hover:bg-red-700">
                <TrendingUp className="h-4 w-4 mr-2" />
                Neue Woche tracken
              </Button>
            </Link>
          </div>

          {/* KPI List */}
          {kpiWeeks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Noch keine KPIs getrackt
                </h3>
                <p className="text-gray-600 mb-6">
                  Starte jetzt mit deinem ersten Weekly KPI-Update!
                </p>
                <Link href={`/member/${memberId}/kpi`}>
                  <Button className="bg-red-600 hover:bg-red-700">
                    Jetzt KPIs eintragen
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {kpiWeeks.map((kpi) => (
                <Card
                  key={kpi.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedKpi(kpi)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">
                            KW {kpi.weekNumber}/{kpi.year}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(kpi.weekStart).toLocaleDateString("de-DE", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Umsatz</p>
                          <p className={`font-semibold ${getPerformanceColor(kpi.umsatzIst, member?.umsatzSollWoche || null)}`}>
                            {formatCurrency(kpi.umsatzIst)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Feeling</p>
                          <p className="text-2xl">{getFeelingEmoji(kpi.feelingScore)}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!selectedKpi} onOpenChange={(open) => !open && setSelectedKpi(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedKpi && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>KW {selectedKpi.weekNumber}/{selectedKpi.year}</span>
                  <span className="text-2xl">{getFeelingEmoji(selectedKpi.feelingScore)}</span>
                </DialogTitle>
                <p className="text-sm text-gray-500">
                  {new Date(selectedKpi.weekStart).toLocaleDateString("de-DE", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Zahlen */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Deine Zahlen</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Umsatz</p>
                      <p className={`text-lg font-semibold ${getPerformanceColor(selectedKpi.umsatzIst, member?.umsatzSollWoche || null)}`}>
                        {formatCurrency(selectedKpi.umsatzIst)}
                      </p>
                    </div>
                    {member?.trackKontakte && selectedKpi.kontakteIst !== null && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Kontakte</p>
                        <p className="text-lg font-semibold">{selectedKpi.kontakteIst}</p>
                      </div>
                    )}
                    {member?.trackEntscheider && selectedKpi.entscheiderIst !== null && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Entscheider</p>
                        <p className="text-lg font-semibold">{selectedKpi.entscheiderIst}</p>
                      </div>
                    )}
                    {member?.trackTermine && selectedKpi.termineVereinbartIst !== null && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Termine vereinbart</p>
                        <p className="text-lg font-semibold">{selectedKpi.termineVereinbartIst}</p>
                      </div>
                    )}
                    {member?.trackTermine && selectedKpi.termineStattgefundenIst !== null && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Termine stattgefunden</p>
                        <p className="text-lg font-semibold">{selectedKpi.termineStattgefundenIst}</p>
                      </div>
                    )}
                    {member?.trackAbschluesse && selectedKpi.termineAbschlussIst !== null && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Abschlüsse</p>
                        <p className="text-lg font-semibold">{selectedKpi.termineAbschlussIst}</p>
                      </div>
                    )}
                    {member?.trackEinheiten && selectedKpi.einheitenIst !== null && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Einheiten</p>
                        <p className="text-lg font-semibold">{selectedKpi.einheitenIst}</p>
                      </div>
                    )}
                    {member?.trackEmpfehlungen && selectedKpi.empfehlungenIst !== null && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Empfehlungen</p>
                        <p className="text-lg font-semibold">{selectedKpi.empfehlungenIst}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reflexion */}
                {(selectedKpi.heldentat || selectedKpi.blockiert || selectedKpi.herausforderung) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Deine Reflexion</h3>
                    <div className="space-y-3">
                      {selectedKpi.heldentat && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-xs text-green-700 font-medium flex items-center gap-1 mb-1">
                            <Trophy className="h-3 w-3" /> Heldentat
                          </p>
                          <p className="text-sm text-green-800">{selectedKpi.heldentat}</p>
                        </div>
                      )}
                      {selectedKpi.blockiert && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-xs text-red-700 font-medium flex items-center gap-1 mb-1">
                            <AlertCircle className="h-3 w-3" /> Was hat blockiert?
                          </p>
                          <p className="text-sm text-red-800">{selectedKpi.blockiert}</p>
                        </div>
                      )}
                      {selectedKpi.herausforderung && (
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="text-xs text-orange-700 font-medium flex items-center gap-1 mb-1">
                            <Lightbulb className="h-3 w-3" /> Herausforderung
                          </p>
                          <p className="text-sm text-orange-800">{selectedKpi.herausforderung}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Feeling Score */}
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500 mb-1">Feeling Score</p>
                  <p className="text-4xl mb-1">{getFeelingEmoji(selectedKpi.feelingScore)}</p>
                  <p className="text-lg font-semibold">{selectedKpi.feelingScore}/10</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
