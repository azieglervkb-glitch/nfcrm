import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/templates - List all templates
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const templates = await prisma.messageTemplate.findMany({
      orderBy: [
        { channel: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST /api/templates - Create a new template
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
    const { slug, name, channel, subject, content, variables } = body;

    if (!slug || !name || !channel || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const template = await prisma.messageTemplate.create({
      data: {
        slug,
        name,
        channel,
        subject,
        content,
        variables: variables || [],
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Template with this slug already exists" },
        { status: 409 }
      );
    }
    console.error("Failed to create template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
