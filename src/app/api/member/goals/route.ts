import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const goals = await prisma.goal.findMany({
      where: { memberId: session.memberId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(
      goals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        targetDate: goal.targetDate?.toISOString() || null,
        status: goal.status,
        createdAt: goal.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Failed to fetch goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, targetDate } = body;

    if (!title) {
      return NextResponse.json(
        { message: "Title is required" },
        { status: 400 }
      );
    }

    const goal = await prisma.goal.create({
      data: {
        memberId: session.memberId,
        title,
        description: description || null,
        targetDate: targetDate ? new Date(targetDate) : null,
        status: "ACTIVE",
      },
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
    console.error("Failed to create goal:", error);
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    );
  }
}
