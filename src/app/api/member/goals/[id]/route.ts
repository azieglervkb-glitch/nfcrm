import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, title, description, targetDate } = body;

    // Verify goal belongs to member
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id,
        memberId: session.memberId,
      },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (targetDate !== undefined) {
      updateData.targetDate = targetDate ? new Date(targetDate) : null;
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      targetDate: goal.targetDate?.toISOString() || null,
      status: goal.status,
      createdAt: goal.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to update goal:", error);
    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify goal belongs to member
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id,
        memberId: session.memberId,
      },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    await prisma.goal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete goal:", error);
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 }
    );
  }
}
