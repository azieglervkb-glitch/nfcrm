import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createLeadSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  vorname: z.string().min(1, "Vorname erforderlich"),
  nachname: z.string().min(1, "Nachname erforderlich"),
  telefon: z.string().optional().nullable(),
  whatsappNummer: z.string().optional().nullable(),
  source: z.enum(["ONEPAGE", "WEBSITE", "SOCIAL_MEDIA", "EMPFEHLUNG", "MANUELL"]).default("MANUELL"),
  sourceDetail: z.string().optional().nullable(),
  interessiertAn: z.string().optional().nullable(),
  notizen: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: any = {};

  if (status && status !== "all") {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { vorname: { contains: search, mode: "insensitive" } },
      { nachname: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  // Sichtbarkeits-Filterung: COACH/MITARBEITER sehen nur zugewiesene Leads
  const userRole = session.user.role;
  if (userRole === "COACH" || userRole === "MITARBEITER") {
    where.assignedToId = session.user.id;
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, vorname: true, nachname: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    leads,
    pagination: {
      page,
      limit,
      total,
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
    const validatedData = createLeadSchema.parse(body);

    // Check if lead already exists
    const existing = await prisma.lead.findUnique({
      where: { email: validatedData.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ein Lead mit dieser E-Mail existiert bereits" },
        { status: 400 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.member.findUnique({
      where: { email: validatedData.email },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "Diese E-Mail ist bereits als Member registriert" },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.create({
      data: validatedData,
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Leads" },
      { status: 500 }
    );
  }
}
