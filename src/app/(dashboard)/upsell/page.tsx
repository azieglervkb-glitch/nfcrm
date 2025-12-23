import { prisma } from "@/lib/prisma";
import { SectionHeader, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, TrendingUp, Phone, Calendar, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { formatDate, formatRelativeTime } from "@/lib/date-utils";

const statusLabels: Record<string, string> = {
  IDENTIFIED: "Identifiziert",
  KONTAKTIERT: "Kontaktiert",
  SETTING_GESPRAECH: "Setting-Gespräch",
  BERATUNG: "Beratung",
  ABGESCHLOSSEN: "Abgeschlossen",
  VERLOREN: "Verloren",
};

const statusColors: Record<string, "default" | "warning" | "info" | "success" | "danger"> = {
  IDENTIFIED: "default",
  KONTAKTIERT: "warning",
  SETTING_GESPRAECH: "info",
  BERATUNG: "info",
  ABGESCHLOSSEN: "success",
  VERLOREN: "danger",
};

async function getUpsellData() {
  const pipeline = await prisma.upsellPipeline.findMany({
    where: {
      status: { not: "VERLOREN" },
    },
    include: {
      member: {
        select: {
          id: true,
          vorname: true,
          nachname: true,
          email: true,
          produkte: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by status
  const grouped = {
    IDENTIFIED: pipeline.filter((p) => p.status === "IDENTIFIED"),
    KONTAKTIERT: pipeline.filter((p) => p.status === "KONTAKTIERT"),
    SETTING_GESPRAECH: pipeline.filter((p) => p.status === "SETTING_GESPRAECH"),
    BERATUNG: pipeline.filter((p) => p.status === "BERATUNG"),
    ABGESCHLOSSEN: pipeline.filter((p) => p.status === "ABGESCHLOSSEN"),
  };

  // Stats
  const stats = {
    total: pipeline.length,
    identified: grouped.IDENTIFIED.length,
    inProgress:
      grouped.KONTAKTIERT.length +
      grouped.SETTING_GESPRAECH.length +
      grouped.BERATUNG.length,
    closed: grouped.ABGESCHLOSSEN.length,
    totalValue: pipeline
      .filter((p) => p.status === "ABGESCHLOSSEN" && p.wert)
      .reduce((sum, p) => sum + Number(p.wert), 0),
  };

  return { pipeline, grouped, stats };
}

export default async function UpsellPage() {
  const { pipeline, grouped, stats } = await getUpsellData();

  const PipelineCard = ({
    entry,
  }: {
    entry: Awaited<ReturnType<typeof getUpsellData>>["pipeline"][0];
  }) => (
    <div className="p-4 bg-card border border-border rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-success/10 text-success text-sm font-semibold">
            {entry.member.vorname.charAt(0)}
            {entry.member.nachname.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <Link
            href={`/members/${entry.member.id}`}
            className="font-medium hover:underline"
          >
            {entry.member.vorname} {entry.member.nachname}
          </Link>
          <p className="text-sm text-muted-foreground">
            {entry.member.produkte.join(", ")}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t">
        <p className="text-sm text-muted-foreground">{entry.triggerReason}</p>
        {entry.triggerRuleId && (
          <span className="inline-flex items-center mt-2 text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
            {entry.triggerRuleId}
          </span>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {formatRelativeTime(entry.createdAt)}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Upsell Pipeline" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">In Pipeline</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Phone className="h-8 w-8 text-warning" />
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Bearbeitung</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold">{stats.closed}</p>
                <p className="text-sm text-muted-foreground">Abgeschlossen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold">
                  {stats.totalValue.toLocaleString("de-DE", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 0,
                  })}
                </p>
                <p className="text-sm text-muted-foreground">Umsatz (Closed)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Pipeline */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {(
          ["IDENTIFIED", "KONTAKTIERT", "SETTING_GESPRAECH", "BERATUNG", "ABGESCHLOSSEN"] as const
        ).map((status) => (
          <Card key={status}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <StatusBadge
                  status={statusColors[status]}
                  label={statusLabels[status]}
                />
                <span className="ml-auto text-muted-foreground">
                  {grouped[status].length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {grouped[status].length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Keine Einträge
                </p>
              ) : (
                grouped[status].map((entry) => (
                  <PipelineCard key={entry.id} entry={entry} />
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
