import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateKpiFeedback } from "@/lib/openai";

// Test endpoint to generate AI feedback with current prompts
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can test prompts
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { memberId, kpiWeekId } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 }
      );
    }

    // Get member
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        vorname: true,
        umsatzSollWoche: true,
        kontakteSoll: true,
        entscheiderSoll: true,
        termineVereinbartSoll: true,
        termineStattgefundenSoll: true,
        termineAbschlussSoll: true,
        einheitenSoll: true,
        empfehlungenSoll: true,
        konvertierungTerminSoll: true,
        abschlussquoteSoll: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get KPI week (specific or latest)
    let kpiWeek;
    if (kpiWeekId) {
      kpiWeek = await prisma.kpiWeek.findUnique({
        where: { id: kpiWeekId },
        select: {
          id: true,
          weekStart: true,
          weekNumber: true,
          year: true,
          feelingScore: true,
          heldentat: true,
          blockiert: true,
          herausforderung: true,
          umsatzIst: true,
          kontakteIst: true,
          entscheiderIst: true,
          termineVereinbartIst: true,
          termineStattgefundenIst: true,
          termineAbschlussIst: true,
          einheitenIst: true,
          empfehlungenIst: true,
          konvertierungTerminIst: true,
          abschlussquoteIst: true,
        },
      });
    } else {
      // Get latest KPI week for this member
      kpiWeek = await prisma.kpiWeek.findFirst({
        where: { memberId },
        orderBy: { weekStart: "desc" },
        select: {
          id: true,
          weekStart: true,
          weekNumber: true,
          year: true,
          feelingScore: true,
          heldentat: true,
          blockiert: true,
          herausforderung: true,
          umsatzIst: true,
          kontakteIst: true,
          entscheiderIst: true,
          termineVereinbartIst: true,
          termineStattgefundenIst: true,
          termineAbschlussIst: true,
          einheitenIst: true,
          empfehlungenIst: true,
          konvertierungTerminIst: true,
          abschlussquoteIst: true,
        },
      });
    }

    if (!kpiWeek) {
      return NextResponse.json(
        { error: "No KPI week found for this member" },
        { status: 404 }
      );
    }

    // Generate test feedback (doesn't save to database)
    const { text, style } = await generateKpiFeedback(member, kpiWeek);

    return NextResponse.json({
      success: true,
      feedback: {
        text,
        style,
        member: {
          id: member.id,
          vorname: member.vorname,
        },
        kpiWeek: {
          id: kpiWeek.id,
          weekNumber: kpiWeek.weekNumber,
          year: kpiWeek.year,
          weekStart: kpiWeek.weekStart.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Failed to generate test feedback:", error);
    return NextResponse.json(
      { error: "Failed to generate test feedback", details: String(error) },
      { status: 500 }
    );
  }
}

