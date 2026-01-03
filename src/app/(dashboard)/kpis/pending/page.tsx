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
import { Mail, MessageSquare, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getCurrentWeekStart, getWeekInfo, formatRelativeTime } from "@/lib/date-utils";

async function getPendingKpis() {
  const weekStart = getCurrentWeekStart();
  const { weekNumber, year } = getWeekInfo(weekStart);

  // Query by weekNumber and year for reliable matching (avoids timezone issues)
  // Only show members who have completed KPI setup (they're the ones expected to submit)
  const activeMembers = await prisma.member.findMany({
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
    include: {
      kpiWeeks: {
        orderBy: { weekStart: "desc" },
        take: 1,
      },
    },
    orderBy: { vorname: "asc" },
  });

  return { pendingMembers: activeMembers, weekNumber, year };
}

export default async function PendingKpisPage() {
  const { pendingMembers, weekNumber, year } = await getPendingKpis();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/kpis">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
        <SectionHeader
          title={`Ausstehende KPIs - KW ${weekNumber}/${year}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {pendingMembers.length} Mitglieder haben noch nicht eingereicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingMembers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-lg font-medium text-success">
                Alle KPIs eingereicht!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Alle aktiven Mitglieder haben ihre KPIs für diese Woche
                eingereicht.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mitglied</TableHead>
                  <TableHead>Letzter KPI</TableHead>
                  <TableHead className="w-[120px]">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingMembers.map((member) => {
                  const lastKpi = member.kpiWeeks[0];
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Link
                          href={`/members/${member.id}`}
                          className="flex items-center gap-3 hover:underline"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-warning/10 text-warning font-semibold text-sm">
                              {member.vorname.charAt(0)}
                              {member.nachname.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.vorname} {member.nachname}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {lastKpi ? (
                          <span className="text-sm">
                            KW {lastKpi.weekNumber}/{lastKpi.year}
                            <span className="text-muted-foreground ml-1">
                              ({formatRelativeTime(lastKpi.submittedAt)})
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Noch nie eingereicht
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="E-Mail senden"
                          >
                            <a href={`mailto:${member.email}`}>
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                          {member.whatsappNummer && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="WhatsApp senden"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
