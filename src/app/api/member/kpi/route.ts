import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function GET() {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await prisma.member.findUnique({
      where: { id: session.memberId },
      include: {
        kpiWeeks: {
          orderBy: { weekStart: "desc" },
          take: 12,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get current week start (Monday)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const currentWeek = member.kpiWeeks.find((entry) => {
      const entryWeek = new Date(entry.weekStart);
      return entryWeek.getTime() === weekStart.getTime();
    });

    // Get member's targets
    const targets = {
      kontakte: member.kontakteSoll || 10,
      termine: member.termineVereinbartSoll || 5,
      abschluesse: member.termineAbschlussSoll || 2,
    };

    // History (exclude current week)
    const history = member.kpiWeeks
      .filter((entry) => {
        const entryWeek = new Date(entry.weekStart);
        return entryWeek.getTime() !== weekStart.getTime();
      })
      .map((entry) => ({
        id: entry.id,
        weekStart: entry.weekStart.toISOString(),
        kontakteGenerated: entry.kontakteIst,
        kontakteTarget: member.kontakteSoll || 0,
        termineClosed: entry.termineVereinbartIst,
        termineTarget: member.termineVereinbartSoll || 0,
        abschluesseCount: entry.termineAbschlussIst,
        abschluesseTarget: member.termineAbschlussSoll || 0,
        umsatz: entry.umsatzIst ? Number(entry.umsatzIst) : null,
        submitted: true,
      }));

    return NextResponse.json({
      currentWeek: currentWeek
        ? {
            id: currentWeek.id,
            weekStart: currentWeek.weekStart.toISOString(),
            kontakteGenerated: currentWeek.kontakteIst,
            kontakteTarget: member.kontakteSoll || 0,
            termineClosed: currentWeek.termineVereinbartIst,
            termineTarget: member.termineVereinbartSoll || 0,
            abschluesseCount: currentWeek.termineAbschlussIst,
            abschluesseTarget: member.termineAbschlussSoll || 0,
            umsatz: currentWeek.umsatzIst ? Number(currentWeek.umsatzIst) : null,
            submitted: false,
          }
        : null,
      history,
      targets,
    });
  } catch (error) {
    console.error("Failed to fetch KPI data:", error);
    return NextResponse.json(
      { error: "Failed to fetch KPI data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { kontakteGenerated, termineClosed, abschluesseCount, umsatz } = body;

    // Get current week start (Monday)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const weekNumber = getWeekNumber(weekStart);
    const year = weekStart.getFullYear();

    // Upsert KPI entry
    const kpiWeek = await prisma.kpiWeek.upsert({
      where: {
        memberId_weekStart: {
          memberId: session.memberId,
          weekStart,
        },
      },
      update: {
        kontakteIst: kontakteGenerated,
        termineVereinbartIst: termineClosed,
        termineAbschlussIst: abschluesseCount,
        umsatzIst: umsatz,
      },
      create: {
        memberId: session.memberId,
        weekStart,
        weekNumber,
        year,
        kontakteIst: kontakteGenerated,
        termineVereinbartIst: termineClosed,
        termineAbschlussIst: abschluesseCount,
        umsatzIst: umsatz,
      },
    });

    return NextResponse.json(kpiWeek);
  } catch (error) {
    console.error("Failed to save KPI data:", error);
    return NextResponse.json(
      { error: "Failed to save KPI data" },
      { status: 500 }
    );
  }
}
