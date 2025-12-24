"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

interface DashboardData {
  member: {
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

export default function MemberDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch("/api/member/dashboard");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load dashboard</p>
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

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white">
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
                <p className="text-sm text-gray-600">Weekly Score</p>
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
                <p className="text-2xl font-bold text-gray-900">{data.streak} Weeks</p>
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
                <p className="text-sm text-gray-600">Goals Done</p>
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
                <p className="text-sm text-gray-600">Pending</p>
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
                This Week's KPIs
              </CardTitle>
              <CardDescription>Track your weekly progress</CardDescription>
            </div>
            <Link href="/member/kpi">
              <Button className="bg-red-600 hover:bg-red-700">
                Update KPIs
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
                  <Badge className="bg-green-100 text-green-800">Target reached!</Badge>
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
                  <Badge className="bg-green-100 text-green-800">Target reached!</Badge>
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
                  <Badge className="bg-green-100 text-green-800">Target reached!</Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No KPIs tracked this week yet</p>
              <Link href="/member/kpi">
                <Button className="bg-red-600 hover:bg-red-700">
                  Start Tracking
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
              My Goals
            </CardTitle>
            <CardDescription>View and manage your S.M.A.R.T. goals</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/member/goals">
              <Button variant="outline" className="w-full">
                View Goals
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              KPI History
            </CardTitle>
            <CardDescription>Review your past performance</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/member/kpi">
              <Button variant="outline" className="w-full">
                View History
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
