import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteLeads } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(lead);
}

export async function PATCH(
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

    const lead = await prisma.lead.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Leads" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check delete permission (SUPER_ADMIN, ADMIN, or explicit permission)
  if (!canDeleteLeads(session.user)) {
    return NextResponse.json(
      { error: "Keine Berechtigung zum Löschen von Leads" },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    // Delete related activities first
    await prisma.leadActivity.deleteMany({
      where: { leadId: id },
    });

    // Then delete the lead
    await prisma.lead.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Leads" },
      { status: 500 }
    );
  }
}
