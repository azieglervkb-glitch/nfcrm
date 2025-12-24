import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users, BarChart3, AlertTriangle, TrendingUp, CheckSquare, Zap } from "lucide-react";
import { StatsCard, SectionHeader, ProgressBar, StatusBadge, getMemberStatusType } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCurrentWeekStart, getWeekInfo, formatRelativeTime } from "@/lib/date-utils";

async function getDashboardData() {
  const weekStart = getCurrentWeekStart();
  const { weekNumber, year } = getWeekInfo(weekStart);

  const [
    totalMembers,
    activeMembers,
    churnRiskMembers,
    upsellCandidates,
    pendingKpisCount,
    submittedKpisCount,
    openTasks,
    recentAutomationLogs,
    recentMembers,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: "AKTIV" } }),
    prisma.member.count({ where: { churnRisk: true, status: "AKTIV" } }),
    prisma.member.count({ where: { upsellCandidate: true, status: "AKTIV" } }),
    prisma.member.count({
      where: {
        status: "AKTIV",
        kpiWeeks: {
          none: {
            weekStart,
          },
        },
      },
    }),
    prisma.kpiWeek.count({
      where: {
        weekStart,
      },
    }),
    prisma.task.count({ where: { status: "OPEN" } }),
    prisma.automationLog.findMany({
      take: 5,
      orderBy: { firedAt: "desc" },
      include: { member: true },
    }),
    prisma.member.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        kpiWeeks: {
          where: { weekStart },
          take: 1,
        },
      },
    }),
  ]);

  return {
    stats: {
      totalMembers,
      activeMembers,
      churnRiskMembers,
      upsellCandidates,
      pendingKpisCount,
      submittedKpisCount,
      openTasks,
    },
    weekInfo: { weekNumber, year },
    recentAutomationLogs,
    recentMembers,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData();

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
            <svg
              viewBox="0 0 50 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-9"
            >
              <path
                d="M2 32 C2 32 6 32 8 30 C12 26 18 14 22 10 C26 6 30 6 34 10 C36 12 38 16 38 16 C38 16 36 12 32 10 C28 8 24 10 20 16 C16 22 10 32 6 34 C4 35 2 34 2 32 Z"
                fill="#dc2626"
              />
              <path
                d="M48 8 C48 8 44 8 42 10 C38 14 32 26 28 30 C24 34 20 34 16 30 C14 28 12 24 12 24 C12 24 14 28 18 30 C22 32 26 30 30 24 C34 18 40 8 44 6 C46 5 48 6 48 8 Z"
                fill="#dc2626"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              Willkommen, {session?.user?.vorname}!
            </h1>
            <p className="text-gray-300">
              Verwalte deine Member und tracke ihre KPIs.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Aktive Member"
          value={data.stats.activeMembers}
          icon={Users}
          subtitle={`von ${data.stats.totalMembers} gesamt`}
        />
        <StatsCard
          title="Ausstehende KPIs"
          value={data.stats.pendingKpisCount}
          icon={BarChart3}
          subtitle={`KW ${data.weekInfo.weekNumber}`}
        />
        <StatsCard
          title="Churn Risk"
          value={data.stats.churnRiskMembers}
          icon={AlertTriangle}
          iconClassName="text-danger"
        />
        <StatsCard
          title="Upsell Ready"
          value={data.stats.upsellCandidates}
          icon={TrendingUp}
          iconClassName="text-success"
        />
      </div>

      {/* KPI Progress for current week */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Aktuelle Woche (KW {data.weekInfo.weekNumber})
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/kpis/pending">Details ansehen</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ProgressBar
            value={data.stats.submittedKpisCount}
            max={data.stats.activeMembers}
            label="KPIs eingereicht"
            colorClassName={
              data.stats.submittedKpisCount / data.stats.activeMembers >= 0.8
                ? "bg-success"
                : data.stats.submittedKpisCount / data.stats.activeMembers >= 0.5
                ? "bg-warning"
                : "bg-danger"
            }
          />
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Zuletzt aktiv
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/members">Alle ansehen</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Noch keine Mitglieder vorhanden
              </p>
            ) : (
              data.recentMembers.map((member) => (
                <Link
                  key={member.id}
                  href={`/members/${member.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {member.vorname.charAt(0)}
                      {member.nachname.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.vorname} {member.nachname}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.kpiWeeks[0]
                        ? "KPI eingereicht"
                        : "KPI ausstehend"}{" "}
                      · {formatRelativeTime(member.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge
                    status={getMemberStatusType(member.status)}
                    label={member.status}
                  />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Automation Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Automation Alerts
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/automations/logs">Alle ansehen</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentAutomationLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine aktuellen Automationen
              </p>
            ) : (
              data.recentAutomationLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {log.ruleId}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.ruleName}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.member
                        ? `${log.member.vorname} ${log.member.nachname}`
                        : "System"}{" "}
                      · {formatRelativeTime(log.firedAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <SectionHeader title="Schnellzugriff" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/members">
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Mitglieder</p>
                  <p className="text-sm text-muted-foreground">
                    Verwalten & bearbeiten
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/kpis">
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/10">
                  <BarChart3 className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="font-semibold">KPI-Tracking</p>
                  <p className="text-sm text-muted-foreground">
                    Wochenübersicht
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/tasks">
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                  <CheckSquare className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="font-semibold">Tasks</p>
                  <p className="text-sm text-muted-foreground">
                    {data.stats.openTasks} offen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/upsell">
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="font-semibold">Upsell Pipeline</p>
                  <p className="text-sm text-muted-foreground">
                    {data.stats.upsellCandidates} Kandidaten
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
