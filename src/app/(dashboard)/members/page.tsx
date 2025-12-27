import { prisma } from "@/lib/prisma";
import { SectionHeader, StatusBadge, getMemberStatusType, FeelingEmoji } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Eye, Mail, MoreHorizontal, Filter } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, getCurrentWeekStart } from "@/lib/date-utils";

interface SearchParams {
  status?: string;
  search?: string;
  page?: string;
}

async function getMembers(searchParams: SearchParams) {
  const status = searchParams.status;
  const search = searchParams.search;
  const page = parseInt(searchParams.page || "1");
  const perPage = 20;

  const weekStart = getCurrentWeekStart();

  const where: any = {};

  if (status && status !== "all") {
    if (status === "churn_risk") {
      where.churnRisk = true;
      where.status = "AKTIV";
    } else if (status === "review") {
      where.reviewFlag = true;
    } else if (status === "upsell") {
      where.upsellCandidate = true;
      where.status = "AKTIV";
    } else {
      where.status = status.toUpperCase();
    }
  }

  if (search) {
    where.OR = [
      { vorname: { contains: search, mode: "insensitive" } },
      { nachname: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      include: {
        kpiWeeks: {
          where: { weekStart },
          take: 1,
          orderBy: { submittedAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.member.count({ where }),
  ]);

  return { members, total, page, perPage };
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { members, total, page, perPage } = await getMembers(params);
  const totalPages = Math.ceil(total / perPage);

  const filterTabs = [
    { label: "Alle", value: "all" },
    { label: "Aktiv", value: "aktiv" },
    { label: "Churn Risk", value: "churn_risk" },
    { label: "Review", value: "review" },
    { label: "Upsell", value: "upsell" },
    { label: "Pausiert", value: "pausiert" },
    { label: "Gekündigt", value: "gekuendigt" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Mitglieder" />
        <Button asChild>
          <Link href="/members/new">
            <Plus className="mr-2 h-4 w-4" />
            Mitglied hinzufügen
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => (
              <Link
                key={tab.value}
                href={`/members?status=${tab.value}${
                  params.search ? `&search=${params.search}` : ""
                }`}
              >
                <Button
                  variant={
                    (params.status || "all") === tab.value ? "default" : "outline"
                  }
                  size="sm"
                >
                  {tab.label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Search */}
          <form className="relative" action="/members" method="GET">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="search"
              type="search"
              placeholder="Suchen..."
              defaultValue={params.search}
              className="w-64 pl-10"
            />
            {params.status && (
              <input type="hidden" name="status" value={params.status} />
            )}
          </form>
        </div>
      </Card>

      {/* Members Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mitglied</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Produkte</TableHead>
              <TableHead>Feeling</TableHead>
              <TableHead>Umsatz (Woche)</TableHead>
              <TableHead className="w-[100px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">
                    Keine Mitglieder gefunden
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => {
                const latestKpi = member.kpiWeeks[0];
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Link
                        href={`/members/${member.id}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
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
                      <div className="flex flex-col gap-1">
                        <StatusBadge
                          status={getMemberStatusType(member.status)}
                          label={member.status}
                        />
                        {member.churnRisk && (
                          <span className="text-xs text-danger font-medium">
                            Churn Risk
                          </span>
                        )}
                        {member.upsellCandidate && (
                          <span className="text-xs text-success font-medium">
                            Upsell Ready
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.produkte.map((product) => (
                          <span
                            key={product}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground"
                          >
                            {product}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {latestKpi?.feelingScore ? (
                        <FeelingEmoji score={latestKpi.feelingScore} size="sm" />
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {latestKpi?.umsatzIst ? (
                        <span className="font-medium">
                          {Number(latestKpi.umsatzIst).toLocaleString("de-DE", {
                            style: "currency",
                            currency: "EUR",
                            minimumFractionDigits: 0,
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/members/${member.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/members/${member.id}`}>
                                Profil ansehen
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/members/${member.id}/edit`}>
                                Bearbeiten
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={`mailto:${member.email}`}>
                                E-Mail senden
                              </a>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Zeige {(page - 1) * perPage + 1} bis{" "}
              {Math.min(page * perPage, total)} von {total} Mitgliedern
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/members?page=${page - 1}${
                      params.status ? `&status=${params.status}` : ""
                    }${params.search ? `&search=${params.search}` : ""}`}
                  >
                    Zurück
                  </Link>
                </Button>
              )}
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/members?page=${page + 1}${
                      params.status ? `&status=${params.status}` : ""
                    }${params.search ? `&search=${params.search}` : ""}`}
                  >
                    Weiter
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
