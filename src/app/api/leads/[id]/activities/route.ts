import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/leads/[id]/activities - Get all activities for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const activities = await prisma.leadActivity.findMany({
      where: { leadId: id },
      include: {
        createdBy: {
          select: {
            id: true,
            vorname: true,
            nachname: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Error fetching lead activities:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Aktivitäten" },
      { status: 500 }
    );
  }
}

// POST /api/leads/[id]/activities - Create a new activity
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      type,
      channel,
      subject,
      notes,
      outcome,
      nextSteps,
      scheduledAt,
      completedAt,
    } = body;

    if (!type) {
      return NextResponse.json(
        { error: "Aktivitätstyp ist erforderlich" },
        { status: 400 }
      );
    }

    // Verify lead exists
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead nicht gefunden" },
        { status: 404 }
      );
    }

    const activity = await prisma.leadActivity.create({
      data: {
        leadId: id,
        type,
        channel,
        subject,
        notes,
        outcome,
        nextSteps,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        completedAt: completedAt ? new Date(completedAt) : null,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            vorname: true,
            nachname: true,
          },
        },
      },
    });

    // Auto-update lead status to KONTAKTIERT if first contact and currently NEU
    if (
      lead.status === "NEU" &&
      ["ANRUF", "EMAIL", "WHATSAPP", "MEETING", "VIDEO_CALL"].includes(type)
    ) {
      await prisma.lead.update({
        where: { id },
        data: { status: "KONTAKTIERT" },
      });

      // Log the status change
      await prisma.leadActivity.create({
        data: {
          leadId: id,
          type: "STATUS_CHANGE",
          subject: "Status geändert: NEU → KONTAKTIERT",
          notes: "Automatisch nach erstem Kontakt",
          createdById: session.user.id,
        },
      });
    }

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error("Error creating lead activity:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Aktivität" },
      { status: 500 }
    );
  }
}
