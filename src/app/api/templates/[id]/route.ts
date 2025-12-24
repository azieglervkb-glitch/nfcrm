import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const template = await prisma.messageTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    return NextResponse.json({ error: "Template nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(template);
}

// PATCH update template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, channel, subject, content, variables, isActive } = body;

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(channel && { channel }),
        ...(subject !== undefined && { subject: subject || null }),
        ...(content && { content }),
        ...(variables && { variables }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Templates" },
      { status: 500 }
    );
  }
}

// DELETE template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.messageTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Templates" },
      { status: 500 }
    );
  }
}
