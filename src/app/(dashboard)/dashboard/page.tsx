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
    // Query by weekNumber and year for reliable matching (avoids timezone issues)
    // Only count members who have completed KPI setup (they're the ones expected to submit)
    prisma.member.count({
      where: {
        status: "AKTIV",
        kpiSetupCompleted: true,
        kpiTrackingEnabled: true,
        kpiWeeks: {
          none: {
            weekNumber,
            year,
          },
        },
      },
    }),
    prisma.kpiWeek.count({
      where: {
        weekNumber,
        year,
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
          where: { weekNumber, year },
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
      <div className="bg-[#ae1d2b]/90 rounded-2xl p-6 text-white">
        <div>
          <h1 className="text-2xl font-bold">
            Willkommen, {session?.user?.vorname}!
          </h1>
          <p className="text-white/80">
            Verwalte deine Member und tracke ihre KPIs.
          </p>
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <Zap className="h-4 w-4" />
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
