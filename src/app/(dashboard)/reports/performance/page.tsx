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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Target,
  TrendingUp,
  Trophy,
  BarChart3,
  RefreshCw,
  Users,
  AlertCircle,
} from "lucide-react";

interface PerformanceData {
  summary: {
    avgKpiScore: number;
    topPerformers: number;
    underPerformers: number;
    totalTracked: number;
    avgKontakteRate: number;
    avgTermineRate: number;
    avgAbschluesseRate: number;
  };
  topPerformersList: Array<{
    id: string;
    name: string;
    email: string;
    kpiScore: number;
    kontakteRate: number;
    termineRate: number;
    abschluesseRate: number;
  }>;
  underPerformersList: Array<{
    id: string;
    name: string;
    email: string;
    kpiScore: number;
    issue: string;
  }>;
  kpiTrend: Array<{
    week: string;
    avgScore: number;
  }>;
}

export default function PerformanceReportPage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/performance?days=${timeRange}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) {
      return <Badge className="bg-green-100 text-green-800">{score}%</Badge>;
    } else if (score >= 50) {
      return <Badge className="bg-yellow-100 text-yellow-800">{score}%</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">{score}%</Badge>;
    }
  };

  const getRateBadge = (rate: number) => {
    if (rate >= 100) {
      return <span className="text-green-600 font-medium">{rate}%</span>;
    } else if (rate >= 70) {
      return <span className="text-yellow-600 font-medium">{rate}%</span>;
    } else {
      return <span className="text-red-600 font-medium">{rate}%</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Report</h1>
            <p className="text-gray-600">Track KPI achievements and member performance</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchData} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg KPI Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : `${data?.summary.avgKpiScore || 0}%`}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Top Performers</p>
                <p className="text-2xl font-bold text-green-600">
                  {loading ? "..." : data?.summary.topPerformers || 0}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Need Attention</p>
                <p className="text-2xl font-bold text-red-600">
                  {loading ? "..." : data?.summary.underPerformers || 0}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tracked</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : data?.summary.totalTracked || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Averages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-red-600" />
            KPI Achievement Rates
          </CardTitle>
          <CardDescription>
            Average achievement rates across all tracked members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600 mb-2">Kontakte</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-gray-900">
                  {loading ? "..." : `${data?.summary.avgKontakteRate || 0}%`}
                </span>
                <span className="text-sm text-gray-500 mb-1">of target</span>
              </div>
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(data?.summary.avgKontakteRate || 0, 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600 mb-2">Termine</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-gray-900">
                  {loading ? "..." : `${data?.summary.avgTermineRate || 0}%`}
                </span>
                <span className="text-sm text-gray-500 mb-1">of target</span>
              </div>
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.min(data?.summary.avgTermineRate || 0, 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600 mb-2">Abschlüsse</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-gray-900">
                  {loading ? "..." : `${data?.summary.avgAbschluesseRate || 0}%`}
                </span>
                <span className="text-sm text-gray-500 mb-1">of target</span>
              </div>
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${Math.min(data?.summary.avgAbschluesseRate || 0, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-600" />
            Top Performers
          </CardTitle>
          <CardDescription>
            Members exceeding their KPI targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : data?.topPerformersList && data.topPerformersList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>KPI Score</TableHead>
                  <TableHead>Kontakte</TableHead>
                  <TableHead>Termine</TableHead>
                  <TableHead>Abschlüsse</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topPerformersList.map((member, index) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                        <span className="font-bold text-yellow-700">
                          {index + 1}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getScoreBadge(member.kpiScore)}</TableCell>
                    <TableCell>{getRateBadge(member.kontakteRate)}</TableCell>
                    <TableCell>{getRateBadge(member.termineRate)}</TableCell>
                    <TableCell>{getRateBadge(member.abschluesseRate)}</TableCell>
                    <TableCell>
                      <Link href={`/members/${member.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No top performers found in this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Underperformers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Need Attention
          </CardTitle>
          <CardDescription>
            Members falling below KPI targets who may need support
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : data?.underPerformersList && data.underPerformersList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>KPI Score</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.underPerformersList.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getScoreBadge(member.kpiScore)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{member.issue}</span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/members/${member.id}`}>
                        <Button size="sm" className="bg-red-600 hover:bg-red-700">
                          Intervene
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              All members are meeting their targets
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            KPI Score Trend
          </CardTitle>
          <CardDescription>Average KPI score over time</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : data?.kpiTrend && data.kpiTrend.length > 0 ? (
            <div className="space-y-4">
              {data.kpiTrend.map((week) => (
                <div key={week.week} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{week.week}</span>
                    <span className="text-gray-600">{week.avgScore}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        week.avgScore >= 80
                          ? "bg-green-500"
                          : week.avgScore >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${week.avgScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No trend data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
