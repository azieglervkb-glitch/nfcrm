import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all templates
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await prisma.messageTemplate.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
}

// POST create new template
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can create templates
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { slug, name, channel, subject, content, variables, isActive } = body;

    if (!slug || !name || !channel || !content) {
      return NextResponse.json(
        { error: "Slug, Name, Kanal und Inhalt sind erforderlich" },
        { status: 400 }
      );
    }

    // Check if slug exists
    const existing = await prisma.messageTemplate.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ein Template mit diesem Slug existiert bereits" },
        { status: 400 }
      );
    }

    const template = await prisma.messageTemplate.create({
      data: {
        slug,
        name,
        channel,
        subject: subject || null,
        content,
        variables: variables || [],
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Templates" },
      { status: 500 }
    );
  }
}
