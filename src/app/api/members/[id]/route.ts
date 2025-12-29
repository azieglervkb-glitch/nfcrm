import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateMemberSchema } from "@/lib/validations";
import { canDeleteMembers } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      kpiWeeks: {
        orderBy: { weekStart: "desc" },
        take: 12,
      },
      tasks: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      notes: {
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: 10,
      },
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json(member);
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
    const validatedData = updateMemberSchema.parse(body);

    const member = await prisma.member.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Mitglieds" },
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
  if (!canDeleteMembers(session.user)) {
    return NextResponse.json(
      { error: "Keine Berechtigung zum Löschen von Mitgliedern" },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    // Check if hard delete is requested (only SUPER_ADMIN)
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get("hard") === "true";

    if (hardDelete && session.user.role === "SUPER_ADMIN") {
      // Hard delete - remove all related data first
      await prisma.$transaction(async (tx) => {
        // Delete related records
        await tx.kpiWeek.deleteMany({ where: { memberId: id } });
        await tx.task.deleteMany({ where: { memberId: id } });
        await tx.memberNote.deleteMany({ where: { memberId: id } });
        await tx.automationCooldown.deleteMany({ where: { memberId: id } });
        await tx.automationLog.deleteMany({ where: { memberId: id } });
        await tx.communicationLog.deleteMany({ where: { memberId: id } });
        await tx.formToken.deleteMany({ where: { memberId: id } });
        await tx.upsellPipeline.deleteMany({ where: { memberId: id } });
        // Finally delete the member
        await tx.member.delete({ where: { id } });
      });
    } else {
      // Soft delete - just set status to INAKTIV
      await prisma.member.update({
        where: { id },
        data: { status: "INAKTIV" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting member:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Mitglieds" },
      { status: 500 }
    );
  }
}
