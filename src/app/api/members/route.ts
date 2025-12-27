import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMemberSchema } from "@/lib/validations";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

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

  // Sichtbarkeits-Filterung: COACH/MITARBEITER sehen nur zugewiesene Members
  const userRole = session.user.role;
  if (userRole === "COACH" || userRole === "MITARBEITER") {
    where.assignedToId = session.user.id;
  }

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, vorname: true, nachname: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.member.count({ where }),
  ]);

  return NextResponse.json({
    members,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Remove fields that don't exist in database
    const { notizen, ...dataWithoutNotizen } = body;

    const validatedData = createMemberSchema.parse(dataWithoutNotizen);

    // Check if email already exists
    const existing = await prisma.member.findUnique({
      where: { email: validatedData.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ein Mitglied mit dieser E-Mail existiert bereits" },
        { status: 400 }
      );
    }

    const member = await prisma.member.create({
      data: validatedData,
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Error creating member:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.issues },
        { status: 400 }
      );
    }

    // Return more detailed error in development
    const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Mitglieds", details: errorMessage },
      { status: 500 }
    );
  }
}
