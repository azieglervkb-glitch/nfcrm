import { prisma } from "@/lib/prisma";
import { SectionHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { getCurrentWeekStart } from "@/lib/date-utils";
import { MembersTable } from "@/components/members/MembersTable";

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
          orderBy: { weekStart: "desc" },
          select: {
            weekStart: true,
            feelingScore: true,
            umsatzIst: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.member.count({ where }),
  ]);

  // Process members to add current week feeling/umsatz and average feeling
  const membersWithFeeling = members.map((member) => {
    const currentWeekKpi = member.kpiWeeks.find(
      (kpi) => kpi.weekStart.getTime() === weekStart.getTime()
    );
    
    const feelingsWithScore = member.kpiWeeks
      .filter((kpi) => kpi.feelingScore !== null)
      .map((kpi) => kpi.feelingScore as number);
    
    const avgFeeling = feelingsWithScore.length > 0
      ? feelingsWithScore.reduce((a, b) => a + b, 0) / feelingsWithScore.length
      : null;

    return {
      ...member,
      currentFeeling: currentWeekKpi?.feelingScore ?? null,
      currentUmsatz: currentWeekKpi?.umsatzIst ? Number(currentWeekKpi.umsatzIst) : null,
      avgFeeling: avgFeeling ? Math.round(avgFeeling * 10) / 10 : null,
      totalKpis: feelingsWithScore.length,
    };
  });

  return { members: membersWithFeeling, total, page, perPage };
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

      {/* Members Table with Bulk Actions */}
      <Card>
        <MembersTable members={members} />

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
