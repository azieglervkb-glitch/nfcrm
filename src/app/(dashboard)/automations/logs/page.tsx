import { prisma } from "@/lib/prisma";
import { SectionHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Zap } from "lucide-react";
import Link from "next/link";
import { formatDate, formatRelativeTime } from "@/lib/date-utils";

interface SearchParams {
  page?: string;
  ruleId?: string;
}

async function getAutomationLogs(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || "1");
  const limit = 50;
  const ruleId = searchParams.ruleId;

  const where: any = {};
  if (ruleId) {
    where.ruleId = ruleId;
  }

  const [logs, total, ruleStats] = await Promise.all([
    prisma.automationLog.findMany({
      where,
      include: {
        member: {
          select: { id: true, vorname: true, nachname: true },
        },
      },
      orderBy: { firedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.automationLog.count({ where }),
    prisma.automationLog.groupBy({
      by: ["ruleId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  return { logs, total, page, limit, ruleStats };
}

export default async function AutomationLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { logs, total, page, limit, ruleStats } = await getAutomationLogs(params);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/automations/rules">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Regeln
          </Link>
        </Button>
        <SectionHeader title="Automation Logs" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Stats Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Nach Regel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link
                href="/automations/logs"
                className={`flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors ${
                  !params.ruleId ? "bg-muted" : ""
                }`}
              >
                <span className="text-sm">Alle</span>
                <span className="text-sm text-muted-foreground">{total}</span>
              </Link>
              {ruleStats.map((stat) => (
                <Link
                  key={stat.ruleId}
                  href={`/automations/logs?ruleId=${stat.ruleId}`}
                  className={`flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors ${
                    params.ruleId === stat.ruleId ? "bg-muted" : ""
                  }`}
                >
                  <span className="text-sm font-medium text-primary">
                    {stat.ruleId}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {stat._count.id}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zeitpunkt</TableHead>
                  <TableHead>Regel</TableHead>
                  <TableHead>Mitglied</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <p className="text-muted-foreground">Keine Logs gefunden</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm">
                            {formatDate(log.firedAt, "dd.MM.yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(log.firedAt, "HH:mm")} Uhr
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary bg-primary/10 px-2 py-1 rounded text-sm">
                            {log.ruleId}
                          </span>
                          <span className="text-sm">{log.ruleName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.member ? (
                          <Link
                            href={`/members/${log.member.id}`}
                            className="flex items-center gap-2 hover:underline"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {log.member.vorname.charAt(0)}
                                {log.member.nachname.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {log.member.vorname} {log.member.nachname}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            System
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {log.actionsTaken.map((action, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-muted px-2 py-1 rounded"
                            >
                              {action}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Seite {page} von {totalPages}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/automations/logs?page=${page - 1}${
                          params.ruleId ? `&ruleId=${params.ruleId}` : ""
                        }`}
                      >
                        Zurück
                      </Link>
                    </Button>
                  )}
                  {page < totalPages && (
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/automations/logs?page=${page + 1}${
                          params.ruleId ? `&ruleId=${params.ruleId}` : ""
                        }`}
                      >
                        Weiter
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
