import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

// PATCH update team member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only super admins can update users
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { email, vorname, nachname, password, role, isActive, taskRuleIds, showAllTasks } = body;

    const updateData: any = {};
    if (email) updateData.email = email;
    if (vorname) updateData.vorname = vorname;
    if (nachname) updateData.nachname = nachname;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (taskRuleIds !== undefined) updateData.taskRuleIds = taskRuleIds;
    if (showAllTasks !== undefined) updateData.showAllTasks = showAllTasks;
    if (password) {
      updateData.passwordHash = await hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        vorname: true,
        nachname: true,
        role: true,
        isActive: true,
        taskRuleIds: true,
        showAllTasks: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Benutzers" },
      { status: 500 }
    );
  }
}

// DELETE team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only super admins can delete users
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent self-deletion
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Du kannst dich nicht selbst löschen" },
      { status: 400 }
    );
  }

  try {
    // Check if user has assigned members
    const user = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { assignedMembers: true } } },
    });

    if (user?._count.assignedMembers && user._count.assignedMembers > 0) {
      return NextResponse.json(
        {
          error: `Dieser Benutzer hat noch ${user._count.assignedMembers} zugewiesene Mitglieder. Bitte zuerst neu zuweisen.`,
        },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Benutzers" },
      { status: 500 }
    );
  }
}
