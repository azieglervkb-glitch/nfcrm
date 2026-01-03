import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canDeleteMembers } from "@/lib/permissions";
import {
  SectionHeader,
  StatusBadge,
  getMemberStatusType,
  FeelingEmoji,
  ProgressBar,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Mail,
  Phone,
  MessageSquare,
  Edit,
  Calendar,
  TrendingUp,
  Target,
  AlertTriangle,
  User,
  ExternalLink,
  GraduationCap,
  RefreshCw,
} from "lucide-react";
import { KpiWeeksList } from "@/components/member/KpiWeeksList";
import { AddNoteDialog } from "@/components/member/AddNoteDialog";
import { SyncLearningSuiteButton } from "@/components/member/SyncLearningSuiteButton";
import { DeleteMemberButton } from "@/components/member/DeleteMemberButton";
import { formatDate, formatRelativeTime } from "@/lib/date-utils";
import { DefinedTooltip } from "@/components/ui/info-tooltip";

async function getMember(id: string) {
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      kpiWeeks: {
        orderBy: { weekStart: "desc" },
        take: 12,
        select: {
          id: true,
          weekStart: true,
          weekNumber: true,
          year: true,
          umsatzIst: true,
          kontakteIst: true,
          entscheiderIst: true,
          termineVereinbartIst: true,
          termineStattgefundenIst: true,
          termineErstIst: true,
          termineFolgeIst: true,
          termineAbschlussIst: true,
          termineNoshowIst: true,
          einheitenIst: true,
          empfehlungenIst: true,
          konvertierungTerminIst: true,
          abschlussquoteIst: true,
          feelingScore: true,
          heldentat: true,
          blockiert: true,
          herausforderung: true,
          aiFeedbackText: true,
          aiFeedbackGeneratedAt: true,
          whatsappFeedbackSent: true,
          whatsappScheduledFor: true,
          whatsappSentAt: true,
          submittedAt: true,
        },
      },
      tasks: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      notes: {
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: 10,
      },
      communicationLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      automationLogs: {
        orderBy: { firedAt: "desc" },
        take: 10,
      },
    },
  });

  return member;
}

// Get module name based on number
function getModuleName(moduleNumber: number | null): string {
  if (!moduleNumber) return "Nicht gestartet";
  const moduleNames: Record<number, string> = {
    1: "Modul 1 - Grundlagen",
    2: "Modul 2 - Aufbau",
    3: "Modul 3 - Vertiefung",
    4: "Modul 4 - Fortgeschritten",
    5: "Modul 5 - Experte",
    6: "Modul 6 - Meister",
  };
  return moduleNames[moduleNumber] || `Modul ${moduleNumber}`;
}

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const defaultTab = resolvedSearchParams.tab || "overview";
  const [member, session] = await Promise.all([getMember(id), auth()]);

  if (!member) {
    notFound();
  }

  const showDeleteButton = canDeleteMembers(session?.user);
  const canHardDelete = session?.user?.role === "SUPER_ADMIN";
  const latestKpi = member.kpiWeeks[0];

  // Calculate performance percentage
  const umsatzPerformance =
    latestKpi?.umsatzIst && member.umsatzSollWoche
      ? (Number(latestKpi.umsatzIst) / Number(member.umsatzSollWoche)) * 100
      : null;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="card-dark">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-white/20">
                <AvatarFallback className="bg-white/10 text-white text-xl font-bold">
                  {member.vorname.charAt(0)}
                  {member.nachname.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white">
                    {member.vorname} {member.nachname}
                  </h1>
                  <StatusBadge
                    status={getMemberStatusType(member.status)}
                    label={member.status}
                  />
                </div>
                <p className="text-gray-300 mt-1">
                  {member.produkte.join(" · ")} · Seit{" "}
                  {formatDate(member.membershipStart)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/member/${member.id}`} target="_blank">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Als Member anmelden
                </Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/members/${member.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Bearbeiten
                </Link>
              </Button>
              {showDeleteButton && (
                <DeleteMemberButton
                  memberId={member.id}
                  memberName={`${member.vorname} ${member.nachname}`}
                  canHardDelete={canHardDelete}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="activity">Aktivität</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="notes">Notizen</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Kontaktdaten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${member.email}`}
                    className="text-sm hover:underline"
                  >
                    {member.email}
                  </a>
                </div>
                {member.telefon && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${member.telefon}`}
                      className="text-sm hover:underline"
                    >
                      {member.telefon}
                    </a>
                  </div>
                )}
                {member.whatsappNummer && (
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{member.whatsappNummer}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Aktuelle Performance
                  {latestKpi && (
                    <span className="text-xs font-normal text-muted-foreground ml-auto">
                      KW {latestKpi.weekNumber}/{latestKpi.year}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {latestKpi ? (
                  <>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Umsatz</span>
                        <span className="font-medium">
                          {Number(latestKpi.umsatzIst || 0).toLocaleString(
                            "de-DE",
                            {
                              style: "currency",
                              currency: "EUR",
                              minimumFractionDigits: 0,
                            }
                          )}{" "}
                          / {Number(member.umsatzSollWoche || 0).toLocaleString(
                            "de-DE",
                            {
                              style: "currency",
                              currency: "EUR",
                              minimumFractionDigits: 0,
                            }
                          )}
                        </span>
                      </div>
                      <ProgressBar
                        value={Number(latestKpi.umsatzIst || 0)}
                        max={Number(member.umsatzSollWoche || 1)}
                        showPercentage={false}
                        colorClassName={
                          umsatzPerformance && umsatzPerformance >= 100
                            ? "bg-success"
                            : umsatzPerformance && umsatzPerformance >= 70
                            ? "bg-warning"
                            : "bg-danger"
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Feeling
                      </span>
                      {latestKpi.feelingScore && (
                        <FeelingEmoji score={latestKpi.feelingScore} />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Letzte Aktualisierung:{" "}
                      {formatRelativeTime(latestKpi.submittedAt)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Noch keine KPI-Daten vorhanden
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Flags & Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Status & Flags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center">
                    Churn Risk
                    <DefinedTooltip term="churnRisk" />
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      member.churnRisk ? "text-danger" : "text-muted-foreground"
                    }`}
                  >
                    {member.churnRisk ? "Ja" : "Nein"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center">
                    Review Flag
                    <DefinedTooltip term="reviewFlag" />
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      member.reviewFlag
                        ? "text-warning"
                        : "text-muted-foreground"
                    }`}
                  >
                    {member.reviewFlag ? "Ja" : "Nein"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center">
                    Upsell Kandidat
                    <DefinedTooltip term="upsellCandidate" />
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      member.upsellCandidate
                        ? "text-success"
                        : "text-muted-foreground"
                    }`}
                  >
                    {member.upsellCandidate ? "Ja" : "Nein"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center">
                    Danger Zone
                    <DefinedTooltip term="dangerZone" />
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      member.dangerZone ? "text-danger" : "text-muted-foreground"
                    }`}
                  >
                    {member.dangerZone ? "Ja" : "Nein"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* LearningSuite Progress */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  LearningSuite
                </CardTitle>
                <SyncLearningSuiteButton memberId={member.id} />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center">
                    Aktuelles Modul
                    <DefinedTooltip term="currentModule" />
                  </span>
                  <span className="text-sm font-medium text-primary">
                    {member.currentModule ? getModuleName(member.currentModule) : "—"}
                  </span>
                </div>
                {member.learningSuiteLastSync && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Letzter Sync</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(member.learningSuiteLastSync)}
                    </span>
                  </div>
                )}
                {member.learningSuiteUserId && (
                  <div className="pt-2 border-t">
                    <span className="text-xs text-muted-foreground font-mono">
                      LS-ID: {member.learningSuiteUserId.length > 12
                        ? `${member.learningSuiteUserId.substring(0, 12)}...`
                        : member.learningSuiteUserId}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Goals */}
          {member.hauptzielEinSatz && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Hauptziel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg italic">"{member.hauptzielEinSatz}"</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">KPI-Verlauf</CardTitle>
            </CardHeader>
            <CardContent>
              <KpiWeeksList
                kpiWeeks={member.kpiWeeks.map((kpi) => ({
                  ...kpi,
                  umsatzIst: kpi.umsatzIst ? Number(kpi.umsatzIst) : null,
                  konvertierungTerminIst: kpi.konvertierungTerminIst ? Number(kpi.konvertierungTerminIst) : null,
                  abschlussquoteIst: kpi.abschlussquoteIst ? Number(kpi.abschlussquoteIst) : null,
                }))}
                memberTracking={{
                  trackKontakte: member.trackKontakte,
                  trackTermine: member.trackTermine,
                  trackEinheiten: member.trackEinheiten,
                  trackEmpfehlungen: member.trackEmpfehlungen,
                  trackEntscheider: member.trackEntscheider,
                  trackAbschluesse: member.trackAbschluesse,
                  trackKonvertierung: member.trackKonvertierung,
                  trackAbschlussquote: member.trackAbschlussquote,
                  umsatzSollWoche: member.umsatzSollWoche ? Number(member.umsatzSollWoche) : null,
                  kontakteSoll: member.kontakteSoll,
                  entscheiderSoll: member.entscheiderSoll,
                  termineVereinbartSoll: member.termineVereinbartSoll,
                  termineStattgefundenSoll: member.termineStattgefundenSoll,
                  termineAbschlussSoll: member.termineAbschlussSoll,
                  einheitenSoll: member.einheitenSoll,
                  empfehlungenSoll: member.empfehlungenSoll,
                  konvertierungTerminSoll: member.konvertierungTerminSoll ? Number(member.konvertierungTerminSoll) : null,
                  abschlussquoteSoll: member.abschlussquoteSoll ? Number(member.abschlussquoteSoll) : null,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Communication Log */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kommunikation</CardTitle>
              </CardHeader>
              <CardContent>
                {member.communicationLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Keine Kommunikation vorhanden
                  </p>
                ) : (
                  <div className="space-y-3">
                    {member.communicationLogs.map((log) => (
                      <div key={log.id} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-secondary">
                            {log.channel}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(log.createdAt)}
                          </span>
                        </div>
                        {log.subject && (
                          <p className="text-sm font-medium">{log.subject}</p>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {log.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Automation Log */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Automationen</CardTitle>
              </CardHeader>
              <CardContent>
                {member.automationLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Keine Automationen ausgelöst
                  </p>
                ) : (
                  <div className="space-y-3">
                    {member.automationLogs.map((log) => (
                      <div key={log.id} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                            {log.ruleId}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(log.firedAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{log.ruleName}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Offene Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {member.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keine offenen Tasks
                </p>
              ) : (
                <div className="space-y-3">
                  {member.tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{task.title}</p>
                        <StatusBadge
                          status={
                            task.priority === "URGENT"
                              ? "danger"
                              : task.priority === "HIGH"
                              ? "warning"
                              : "default"
                          }
                          label={task.priority}
                        />
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Notizen</CardTitle>
                <AddNoteDialog memberId={member.id} />
              </div>
            </CardHeader>
            <CardContent>
              {member.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keine Notizen vorhanden
                </p>
              ) : (
                <div className="space-y-3">
                  {member.notes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-3 rounded-lg ${
                        note.isPinned ? "bg-warning/10 border border-warning/20" : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">
                          {note.authorName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(note.createdAt)}
                        </span>
                        {note.isPinned && (
                          <span className="text-xs font-medium text-warning">
                            Angepinnt
                          </span>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
