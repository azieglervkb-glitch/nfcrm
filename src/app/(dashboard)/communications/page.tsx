import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter
} from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/date-utils";

async function getCommunicationLogs(searchParams: { channel?: string; page?: string }) {
  const page = parseInt(searchParams.page || "1");
  const perPage = 20;
  const skip = (page - 1) * perPage;

  const where: any = {};
  if (searchParams.channel && searchParams.channel !== "all") {
    where.channel = searchParams.channel;
  }

  const [logs, total] = await Promise.all([
    prisma.communicationLog.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            vorname: true,
            nachname: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
    }),
    prisma.communicationLog.count({ where }),
  ]);

  return { logs, total, page, perPage };
}

function getChannelIcon(channel: string) {
  switch (channel) {
    case "WHATSAPP":
      return <MessageSquare className="h-4 w-4" />;
    case "EMAIL":
      return <Mail className="h-4 w-4" />;
    case "SMS":
      return <Phone className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
}

function getStatusBadge(sent: boolean, errorMessage: string | null) {
  if (errorMessage) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Fehler
      </Badge>
    );
  }
  if (sent) {
    return (
      <Badge variant="default" className="gap-1 bg-green-600">
        <CheckCircle className="h-3 w-3" />
        Gesendet
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" />
      Ausstehend
    </Badge>
  );
}

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const { logs, total, page, perPage } = await getCommunicationLogs(params);
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nachrichten-Log</h1>
          <p className="text-muted-foreground">
            Alle gesendeten Nachrichten an Mitglieder
          </p>
        </div>
        <Button asChild>
          <Link href="/communications/templates">
            Templates verwalten
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Kanal:</span>
            </div>
            <div className="flex gap-2">
              <Link href="/communications">
                <Badge
                  variant={!params.channel || params.channel === "all" ? "default" : "outline"}
                  className="cursor-pointer"
                >
                  Alle
                </Badge>
              </Link>
              <Link href="/communications?channel=WHATSAPP">
                <Badge
                  variant={params.channel === "WHATSAPP" ? "default" : "outline"}
                  className="cursor-pointer gap-1"
                >
                  <MessageSquare className="h-3 w-3" />
                  WhatsApp
                </Badge>
              </Link>
              <Link href="/communications?channel=EMAIL">
                <Badge
                  variant={params.channel === "EMAIL" ? "default" : "outline"}
                  className="cursor-pointer gap-1"
                >
                  <Mail className="h-3 w-3" />
                  E-Mail
                </Badge>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-sm text-muted-foreground">Gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {logs.filter(l => l.sent && !l.errorMessage).length}
            </div>
            <p className="text-sm text-muted-foreground">Erfolgreich (diese Seite)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {logs.filter(l => l.errorMessage).length}
            </div>
            <p className="text-sm text-muted-foreground">Fehler (diese Seite)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {logs.filter(l => !l.sent && !l.errorMessage).length}
            </div>
            <p className="text-sm text-muted-foreground">Ausstehend (diese Seite)</p>
          </CardContent>
        </Card>
      </div>

      {/* Log List */}
      <Card>
        <CardHeader>
          <CardTitle>Nachrichten ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Keine Nachrichten</h3>
              <p className="text-sm text-muted-foreground">
                Es wurden noch keine Nachrichten gesendet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {getChannelIcon(log.channel)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/members/${log.memberId}`}
                        className="font-semibold hover:underline"
                      >
                        {log.member.vorname} {log.member.nachname}
                      </Link>
                      <Badge variant="outline" className="text-xs">
                        {log.type}
                      </Badge>
                      {getStatusBadge(log.sent, log.errorMessage)}
                    </div>
                    {log.subject && (
                      <p className="text-sm font-medium text-foreground mb-1">
                        {log.subject}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {log.content}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{log.recipient}</span>
                      <span>{formatRelativeTime(log.createdAt)}</span>
                      {log.ruleId && (
                        <Badge variant="secondary" className="text-xs">
                          Regel: {log.ruleId}
                        </Badge>
                      )}
                    </div>
                    {log.errorMessage && (
                      <p className="text-xs text-red-600 mt-1">
                        Fehler: {log.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {page > 1 && (
                <Link href={`/communications?page=${page - 1}${params.channel ? `&channel=${params.channel}` : ""}`}>
                  <Button variant="outline" size="sm">
                    Zurück
                  </Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                Seite {page} von {totalPages}
              </span>
              {page < totalPages && (
                <Link href={`/communications?page=${page + 1}${params.channel ? `&channel=${params.channel}` : ""}`}>
                  <Button variant="outline" size="sm">
                    Weiter
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
