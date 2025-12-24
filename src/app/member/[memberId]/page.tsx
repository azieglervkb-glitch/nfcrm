"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  LogOut,
  Home,
} from "lucide-react";

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

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Fetch dashboard data
      const dashboardResponse = await fetch(`/api/member/dashboard?memberId=${memberId}`);
      if (dashboardResponse.ok) {
        const result = await dashboardResponse.json();
        setData(result);
      }
    } catch (err) {
      console.error("Failed to initialize session:", err);
      setError("Fehler beim Laden");
    } finally {
      setLoading(false);
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
            <img
              src="/nf-logo.png"
              alt="NF Mentoring"
              className="h-12 w-auto mx-auto mb-4"
            />
            <CardTitle className="text-red-600">Zugang nicht möglich</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600">
              Bitte kontaktiere uns, wenn du Hilfe benötigst.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Keine Daten gefunden</p>
      </div>
    );
  }

  const kpiProgress = data.currentWeekKpi
    ? {
        kontakte: data.currentWeekKpi.kontakteTarget > 0
          ? Math.round(((data.currentWeekKpi.kontakteGenerated || 0) / data.currentWeekKpi.kontakteTarget) * 100)
          : 0,
        termine: data.currentWeekKpi.termineTarget > 0
          ? Math.round(((data.currentWeekKpi.termineClosed || 0) / data.currentWeekKpi.termineTarget) * 100)
          : 0,
        abschluesse: data.currentWeekKpi.abschluesseTarget > 0
          ? Math.round(((data.currentWeekKpi.abschluesseCount || 0) / data.currentWeekKpi.abschluesseTarget) * 100)
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
              <img
                src="/nf-logo.png"
                alt="NF Mentoring"
                className="h-8 w-auto"
              />
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
              <span className="text-sm text-gray-600">
                Willkommen, {data.member.firstName}
              </span>
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
            <h1 className="text-2xl font-bold">
              Willkommen zurück, {data.member.firstName}!
            </h1>
            <p className="text-red-100 mt-1">
              Hier ist dein aktueller Fortschritt
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Wochen-Score</p>
                    <p className="text-2xl font-bold text-gray-900">{data.weeklyScore}%</p>
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
                    <p className="text-2xl font-bold text-gray-900">{data.streak} Wochen</p>
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
                    <p className="text-2xl font-bold text-green-600">{data.completedGoals}</p>
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
                    <p className="text-2xl font-bold text-orange-600">{data.pendingGoals}</p>
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
                        {data.currentWeekKpi?.kontakteGenerated || 0} / {data.currentWeekKpi?.kontakteTarget || 0}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          kpiProgress.kontakte >= 100 ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${Math.min(kpiProgress.kontakte, 100)}%` }}
                      />
                    </div>
                    {kpiProgress.kontakte >= 100 && (
                      <Badge className="bg-green-100 text-green-800">Ziel erreicht!</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Termine</span>
                      <span className="text-sm text-gray-600">
                        {data.currentWeekKpi?.termineClosed || 0} / {data.currentWeekKpi?.termineTarget || 0}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          kpiProgress.termine >= 100 ? "bg-green-500" : "bg-purple-500"
                        }`}
                        style={{ width: `${Math.min(kpiProgress.termine, 100)}%` }}
                      />
                    </div>
                    {kpiProgress.termine >= 100 && (
                      <Badge className="bg-green-100 text-green-800">Ziel erreicht!</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Abschlüsse</span>
                      <span className="text-sm text-gray-600">
                        {data.currentWeekKpi?.abschluesseCount || 0} / {data.currentWeekKpi?.abschluesseTarget || 0}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          kpiProgress.abschluesse >= 100 ? "bg-green-500" : "bg-orange-500"
                        }`}
                        style={{ width: `${Math.min(kpiProgress.abschluesse, 100)}%` }}
                      />
                    </div>
                    {kpiProgress.abschluesse >= 100 && (
                      <Badge className="bg-green-100 text-green-800">Ziel erreicht!</Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">Diese Woche noch keine KPIs eingetragen</p>
                  <Link href={`/member/${memberId}/kpi`}>
                    <Button className="bg-red-600 hover:bg-red-700">
                      Jetzt starten
                    </Button>
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
                <Link href={`/member/${memberId}/kpi`}>
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
