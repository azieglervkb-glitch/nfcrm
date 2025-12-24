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
  UserMinus,
  Users,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Calendar,
} from "lucide-react";

interface RetentionData {
  summary: {
    totalMembers: number;
    activeMembers: number;
    atRiskMembers: number;
    pausedMembers: number;
    churnedMembers: number;
    retentionRate: number;
    churnRate: number;
  };
  atRiskList: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    riskReason: string;
    lastActivity: string | null;
    daysInactive: number;
  }>;
  churnedList: Array<{
    id: string;
    name: string;
    email: string;
    churnDate: string | null;
    membershipDuration: number;
  }>;
  retentionByMonth: Array<{
    month: string;
    retained: number;
    churned: number;
    rate: number;
  }>;
}

export default function RetentionReportPage() {
  const [data, setData] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("90");

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/retention?days=${timeRange}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch retention data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-800">Aktiv</Badge>;
      case "AT_RISK":
        return <Badge className="bg-red-100 text-red-800">Gefährdet</Badge>;
      case "PAUSED":
        return <Badge className="bg-yellow-100 text-yellow-800">Pausiert</Badge>;
      case "CHURNED":
        return <Badge className="bg-gray-100 text-gray-800">Abgewandert</Badge>;
      default:
        return <Badge>{status}</Badge>;
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
            <h1 className="text-2xl font-bold text-gray-900">Retention Report</h1>
            <p className="text-gray-600">Analyze member retention and churn</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
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
                <p className="text-sm font-medium text-gray-600">Retention Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {loading ? "..." : `${data?.summary.retentionRate || 0}%`}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Churn Rate</p>
                <p className="text-2xl font-bold text-red-600">
                  {loading ? "..." : `${data?.summary.churnRate || 0}%`}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">At Risk</p>
                <p className="text-2xl font-bold text-orange-600">
                  {loading ? "..." : data?.summary.atRiskMembers || 0}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-full">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Churned</p>
                <p className="text-2xl font-bold text-gray-600">
                  {loading ? "..." : data?.summary.churnedMembers || 0}
                </p>
              </div>
              <div className="p-3 bg-gray-100 rounded-full">
                <UserMinus className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At Risk Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            At-Risk Members
          </CardTitle>
          <CardDescription>
            Members showing signs of disengagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : data?.atRiskList && data.atRiskList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk Reason</TableHead>
                  <TableHead>Days Inactive</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.atRiskList.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{member.riskReason}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${member.daysInactive > 14 ? "text-red-600" : "text-orange-600"}`}>
                        {member.daysInactive} days
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/members/${member.id}`}>
                        <Button size="sm" variant="outline">
                          View Profile
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No at-risk members found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Churned Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-gray-600" />
            Recently Churned
          </CardTitle>
          <CardDescription>
            Members who have left the program
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : data?.churnedList && data.churnedList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Churn Date</TableHead>
                  <TableHead>Membership Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.churnedList.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {member.churnDate
                          ? new Date(member.churnDate).toLocaleDateString("de-DE")
                          : "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-600">
                        {member.membershipDuration} days
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/members/${member.id}`}>
                        <Button size="sm" variant="outline">
                          View Profile
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No churned members in this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Retention Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Retention Trend</CardTitle>
          <CardDescription>Retention rate over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : data?.retentionByMonth && data.retentionByMonth.length > 0 ? (
            <div className="space-y-4">
              {data.retentionByMonth.map((month) => (
                <div key={month.month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{month.month}</span>
                    <span className="text-gray-600">
                      {month.retained} retained / {month.churned} churned ({month.rate}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${month.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No retention data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
