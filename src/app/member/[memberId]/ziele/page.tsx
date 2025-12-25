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
  BarChart3,
  Target,
  User,
  Home,
  TrendingUp,
  Loader2,
  Trophy,
  Calendar,
} from "lucide-react";

interface MemberGoals {
  vorname: string;
  hauptzielEinSatz: string | null;
  umsatzSollWoche: number | null;
  umsatzSollMonat: number | null;
  kontakteSoll: number | null;
  termineVereinbartSoll: number | null;
  termineAbschlussSoll: number | null;
  einheitenSoll: number | null;
  empfehlungenSoll: number | null;
  trackKontakte: boolean;
  trackTermine: boolean;
  trackAbschluesse: boolean;
  trackEinheiten: boolean;
  trackEmpfehlungen: boolean;
}

export default function MemberGoalsPage() {
  const params = useParams();
  const memberId = params.memberId as string;

  const [memberGoals, setMemberGoals] = useState<MemberGoals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (memberId) {
      fetchMemberGoals();
    }
  }, [memberId]);

  const fetchMemberGoals = async () => {
    try {
      const response = await fetch(`/api/member/goals?memberId=${memberId}`);
      if (response.ok) {
        const data = await response.json();
        setMemberGoals(data);
      }
    } catch (error) {
      console.error("Failed to fetch goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return Number(value).toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    });
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
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <img src="/nf-logo.png" alt="NF Mentoring" className="h-8 w-auto" />
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      item.href.includes("/ziele")
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
                item.href.includes("/ziele") ? "text-red-600" : "text-gray-600"
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meine Ziele</h1>
            <p className="text-gray-600">Deine definierten Ziele und Wochenziele</p>
          </div>

          {/* Hauptziel */}
          {memberGoals?.hauptzielEinSatz && (
            <Card className="bg-gradient-to-br from-red-600 to-red-700 text-white">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-full">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">Mein Hauptziel</CardTitle>
                    <CardDescription className="text-red-100">
                      Das hast du dir vorgenommen
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">"{memberGoals.hauptzielEinSatz}"</p>
              </CardContent>
            </Card>
          )}

          {/* Umsatzziele */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Umsatzziele</CardTitle>
                  <CardDescription>Deine finanziellen Ziele</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500 mb-1">Wochenziel</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(memberGoals?.umsatzSollWoche || null)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500 mb-1">Monatsziel</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(memberGoals?.umsatzSollMonat || null)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aktivitätsziele */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Wöchentliche Aktivitätsziele</CardTitle>
                  <CardDescription>Deine KPI-Ziele pro Woche</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {memberGoals?.trackKontakte && memberGoals.kontakteSoll && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500 mb-1">Kontakte</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {memberGoals.kontakteSoll}
                    </p>
                  </div>
                )}
                {memberGoals?.trackTermine && memberGoals.termineVereinbartSoll && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500 mb-1">Termine</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {memberGoals.termineVereinbartSoll}
                    </p>
                  </div>
                )}
                {memberGoals?.trackAbschluesse && memberGoals.termineAbschlussSoll && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500 mb-1">Abschlüsse</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {memberGoals.termineAbschlussSoll}
                    </p>
                  </div>
                )}
                {memberGoals?.trackEinheiten && memberGoals.einheitenSoll && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500 mb-1">Einheiten</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {memberGoals.einheitenSoll}
                    </p>
                  </div>
                )}
                {memberGoals?.trackEmpfehlungen && memberGoals.empfehlungenSoll && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500 mb-1">Empfehlungen</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {memberGoals.empfehlungenSoll}
                    </p>
                  </div>
                )}
              </div>
              {!memberGoals?.kontakteSoll &&
               !memberGoals?.termineVereinbartSoll &&
               !memberGoals?.termineAbschlussSoll &&
               !memberGoals?.einheitenSoll &&
               !memberGoals?.empfehlungenSoll && (
                <p className="text-center text-gray-500 py-4">
                  Keine Aktivitätsziele definiert
                </p>
              )}
            </CardContent>
          </Card>

          {/* CTA */}
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="py-8 text-center">
              <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">
                Ziele anpassen?
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                Wenn du deine Ziele ändern möchtest, wende dich an deinen Coach.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
