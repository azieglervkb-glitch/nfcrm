import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await prisma.member.findUnique({
      where: { id: session.memberId },
      include: {
        kpiEntries: {
          orderBy: { weekStart: "desc" },
          take: 12,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get or create current week's KPI entry
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    let currentWeek = member.kpiEntries.find((entry) => {
      const entryWeek = new Date(entry.weekStart);
      return entryWeek.getTime() === weekStart.getTime();
    });

    // Get member's targets
    const targets = {
      kontakte: member.kontakteTarget || 10,
      termine: member.termineTarget || 5,
      abschluesse: member.abschluesseTarget || 2,
    };

    // History (exclude current week)
    const history = member.kpiEntries
      .filter((entry) => {
        const entryWeek = new Date(entry.weekStart);
        return entryWeek.getTime() !== weekStart.getTime();
      })
      .map((entry) => ({
        id: entry.id,
        weekStart: entry.weekStart.toISOString(),
        kontakteGenerated: entry.kontakteGenerated,
        kontakteTarget: entry.kontakteTarget,
        termineClosed: entry.termineClosed,
        termineTarget: entry.termineTarget,
        abschluesseCount: entry.abschluesseCount,
        abschluesseTarget: entry.abschluesseTarget,
        umsatz: entry.umsatz,
        submitted: true,
      }));

    return NextResponse.json({
      currentWeek: currentWeek
        ? {
            id: currentWeek.id,
            weekStart: currentWeek.weekStart.toISOString(),
            kontakteGenerated: currentWeek.kontakteGenerated,
            kontakteTarget: currentWeek.kontakteTarget,
            termineClosed: currentWeek.termineClosed,
            termineTarget: currentWeek.termineTarget,
            abschluesseCount: currentWeek.abschluesseCount,
            abschluesseTarget: currentWeek.abschluesseTarget,
            umsatz: currentWeek.umsatz,
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

    const member = await prisma.member.findUnique({
      where: { id: session.memberId },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get current week start
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    // Upsert KPI entry
    const kpiEntry = await prisma.kPIEntry.upsert({
      where: {
        memberId_weekStart: {
          memberId: session.memberId,
          weekStart,
        },
      },
      update: {
        kontakteGenerated,
        termineClosed,
        abschluesseCount,
        umsatz,
      },
      create: {
        memberId: session.memberId,
        weekStart,
        kontakteGenerated,
        kontakteTarget: member.kontakteTarget || 10,
        termineClosed,
        termineTarget: member.termineTarget || 5,
        abschluesseCount,
        abschluesseTarget: member.abschluesseTarget || 2,
        umsatz,
      },
    });

    return NextResponse.json(kpiEntry);
  } catch (error) {
    console.error("Failed to save KPI data:", error);
    return NextResponse.json(
      { error: "Failed to save KPI data" },
      { status: 500 }
    );
  }
}
