import { prisma } from "@/lib/prisma";
import { SectionHeader, FeelingEmoji, ProgressBar } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import Link from "next/link";
import {
  getCurrentWeekStart,
  getWeekInfo,
  getWeekRangeString,
  getNextWeek,
  getPreviousWeek,
  formatDate,
  getIsoWeekString,
  parseIsoWeekString,
} from "@/lib/date-utils";

interface SearchParams {
  week?: string;
}

async function getKpiData(weekStart: Date) {
  const { weekNumber, year } = getWeekInfo(weekStart);

  // Only count members who have completed KPI setup for "pending" calculation
  const [activeMembers, kpis] = await Promise.all([
    prisma.member.findMany({
      where: {
        status: "AKTIV",
        kpiSetupCompleted: true,
        kpiTrackingEnabled: true,
      },
      select: {
        id: true,
        vorname: true,
        nachname: true,
        email: true,
        umsatzSollWoche: true,
      },
    }),
    // Query by weekNumber and year for reliable matching (avoids timezone issues)
    prisma.kpiWeek.findMany({
      where: { weekNumber, year },
      include: {
        member: {
          select: {
            id: true,
            vorname: true,
            nachname: true,
            umsatzSollWoche: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  // Calculate stats
  const submittedIds = new Set(kpis.map((k) => k.memberId));
  const submitted = kpis.length;
  const pending = activeMembers.filter((m) => !submittedIds.has(m.id));

  // Aggregate stats
  const totalUmsatz = kpis.reduce(
    (sum, k) => sum + Number(k.umsatzIst || 0),
    0
  );
  const avgFeeling =
    kpis.length > 0
      ? kpis.reduce((sum, k) => sum + (k.feelingScore || 0), 0) / kpis.length
      : 0;

  return {
    weekNumber,
    year,
    weekStart,
    activeMembers,
    kpis,
    stats: {
      submitted,
      pending: pending.length,
      totalUmsatz,
      avgFeeling: Math.round(avgFeeling * 10) / 10,
    },
    pendingMembers: pending,
  };
}

export default async function KpisPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const weekStart = params.week
    ? parseIsoWeekString(params.week)
    : getCurrentWeekStart();
  const data = await getKpiData(weekStart);

  const prevWeek = getIsoWeekString(getPreviousWeek(weekStart));
  const nextWeek = getIsoWeekString(getNextWeek(weekStart));
  const currentWeek = getIsoWeekString(getCurrentWeekStart());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="KPI-Tracking" />
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/kpis?week=${prevWeek}`}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Vorherige Woche
              </Link>
            </Button>

            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">
                  KW {data.weekNumber}/{data.year}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {getWeekRangeString(data.weekStart)}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={getIsoWeekString(weekStart) === currentWeek}
            >
              <Link href={`/kpis?week=${nextWeek}`}>
                Nächste Woche
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Eingereicht</p>
            <p className="text-3xl font-bold text-success">
              {data.stats.submitted}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Ausstehend</p>
            <p className="text-3xl font-bold text-warning">
              {data.stats.pending}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Gesamt Umsatz</p>
            <p className="text-3xl font-bold">
              {data.stats.totalUmsatz.toLocaleString("de-DE", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 0,
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Durchschn. Feeling</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold">{data.stats.avgFeeling}</p>
              {data.stats.avgFeeling > 0 && (
                <FeelingEmoji
                  score={Math.round(data.stats.avgFeeling)}
                  showScore={false}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <ProgressBar
            value={data.stats.submitted}
            max={data.activeMembers.length}
            label="Fortschritt"
            colorClassName={
              data.stats.submitted / data.activeMembers.length >= 0.8
                ? "bg-success"
                : data.stats.submitted / data.activeMembers.length >= 0.5
                ? "bg-warning"
                : "bg-danger"
            }
          />
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Submitted KPIs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eingereichte KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            {data.kpis.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Noch keine KPIs eingereicht
              </p>
            ) : (
              <div className="space-y-3">
                {data.kpis.map((kpi) => {
                  const performance =
                    kpi.member.umsatzSollWoche && kpi.umsatzIst
                      ? (Number(kpi.umsatzIst) /
                          Number(kpi.member.umsatzSollWoche)) *
                        100
                      : null;
                  return (
                    <Link
                      key={kpi.id}
                      href={`/members/${kpi.memberId}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {kpi.member.vorname.charAt(0)}
                          {kpi.member.nachname.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {kpi.member.vorname} {kpi.member.nachname}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {Number(kpi.umsatzIst || 0).toLocaleString("de-DE", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                          })}
                          {performance !== null && (
                            <span
                              className={`ml-2 ${
                                performance >= 100
                                  ? "text-success"
                                  : performance >= 70
                                  ? "text-warning"
                                  : "text-danger"
                              }`}
                            >
                              ({Math.round(performance)}%)
                            </span>
                          )}
                        </p>
                      </div>
                      {kpi.feelingScore && (
                        <FeelingEmoji score={kpi.feelingScore} size="sm" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending KPIs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Ausstehend</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/kpis/pending">Alle ansehen</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.pendingMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Alle KPIs eingereicht!
              </p>
            ) : (
              <div className="space-y-3">
                {data.pendingMembers.slice(0, 10).map((member) => (
                  <Link
                    key={member.id}
                    href={`/members/${member.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 hover:bg-warning/20 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-warning/20 text-warning font-semibold text-sm">
                        {member.vorname.charAt(0)}
                        {member.nachname.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {member.vorname} {member.nachname}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
