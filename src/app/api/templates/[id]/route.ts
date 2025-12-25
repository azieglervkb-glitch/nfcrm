import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/templates/[id] - Get a single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const template = await prisma.messageTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

// PUT /api/templates/[id] - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can update templates
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Only allow updating certain fields
    const updateData: any = {};
    if (body.content !== undefined) updateData.content = body.content;
    if (body.subject !== undefined) updateData.subject = body.subject;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.variables !== undefined) updateData.variables = body.variables;

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ template });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }
    console.error("Failed to update template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE /api/templates/[id] - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can delete templates
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    await prisma.messageTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }
    console.error("Failed to delete template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
