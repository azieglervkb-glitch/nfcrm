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
import {
  BarChart3,
  TrendingUp,
  Users,
  UserMinus,
  Target,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface ReportStats {
  totalMembers: number;
  activeMembers: number;
  churnedMembers: number;
  retentionRate: number;
  avgKpiScore: number;
  topPerformers: number;
  atRiskMembers: number;
  weeklyGrowth: number;
}

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/reports/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const reportCards = [
    {
      title: "Retention Report",
      description: "Analyze member retention, churn rates, and identify at-risk members",
      icon: UserMinus,
      href: "/reports/retention",
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Performance Report",
      description: "Track KPI achievements, goal progress, and member performance metrics",
      icon: Target,
      href: "/reports/performance",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Analytics and insights for your mentoring program</p>
        </div>
        <Button onClick={fetchStats} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : stats?.totalMembers || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Retention Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : `${stats?.retentionRate || 0}%`}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg KPI Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : `${stats?.avgKpiScore || 0}%`}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">At Risk</p>
                <p className="text-2xl font-bold text-red-600">
                  {loading ? "..." : stats?.atRiskMembers || 0}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <UserMinus className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCards.map((report) => (
          <Card key={report.href} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={`p-3 ${report.bgColor} rounded-lg`}>
                  <report.icon className={`h-6 w-6 ${report.color}`} />
                </div>
              </div>
              <CardTitle className="mt-4">{report.title}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={report.href}>
                <Button className="w-full bg-red-600 hover:bg-red-700">
                  View Report
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Insights</CardTitle>
          <CardDescription>Key metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Top Performers</p>
                  <p className="text-sm text-gray-600">Members exceeding KPI targets</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-green-600">
                {loading ? "..." : stats?.topPerformers || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Active Members</p>
                  <p className="text-sm text-gray-600">Currently engaged in program</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {loading ? "..." : stats?.activeMembers || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full">
                  <BarChart3 className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Weekly Growth</p>
                  <p className="text-sm text-gray-600">New members this week</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-orange-600">
                +{loading ? "..." : stats?.weeklyGrowth || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
