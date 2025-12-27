import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

// GET all team members
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can view team
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const team = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      vorname: true,
      nachname: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      taskRuleIds: true,
      showAllTasks: true,
    },
    orderBy: [{ role: "asc" }, { vorname: "asc" }],
  });

  return NextResponse.json(team);
}

// POST create new team member
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only super admins can create users
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, vorname, nachname, password, role, isActive, taskRuleIds, showAllTasks } = body;

    if (!email || !vorname || !nachname || !password) {
      return NextResponse.json(
        { error: "Alle Felder sind erforderlich" },
        { status: 400 }
      );
    }

    // Check if email exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ein Benutzer mit dieser E-Mail existiert bereits" },
        { status: 400 }
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        vorname,
        nachname,
        passwordHash,
        role: role || "COACH",
        isActive: isActive ?? true,
        taskRuleIds: taskRuleIds || [],
        showAllTasks: showAllTasks ?? false,
      },
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

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Benutzers" },
      { status: 500 }
    );
  }
}
