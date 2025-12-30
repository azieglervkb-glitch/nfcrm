import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { sendTaskNotification } from "@/lib/email";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  memberId: z.string().optional(),
  assignedToId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().optional(),
});

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    include: {
      member: {
        select: { id: true, vorname: true, nachname: true },
      },
      assignedTo: {
        select: { id: true, vorname: true, nachname: true },
      },
    },
    orderBy: [
      { priority: "desc" },
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createTaskSchema.parse(body);

    const assignedToId = data.assignedToId || session.user.id;

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        memberId: data.memberId,
        assignedToId,
        createdById: session.user.id,
        priority: data.priority || "MEDIUM",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        member: {
          select: { id: true, vorname: true, nachname: true },
        },
        assignedTo: {
          select: { id: true, vorname: true, nachname: true, email: true, notifyNewTask: true },
        },
        createdBy: {
          select: { vorname: true, nachname: true },
        },
      },
    });

    // Send notification to assigned user (if different from creator and notifications enabled)
    if (
      task.assignedTo &&
      task.assignedTo.notifyNewTask &&
      assignedToId !== session.user.id
    ) {
      const memberName = task.member
        ? `${task.member.vorname} ${task.member.nachname}`
        : undefined;
      const createdByName = task.createdBy
        ? `${task.createdBy.vorname} ${task.createdBy.nachname}`
        : "System";

      // Send async, don't wait
      sendTaskNotification({
        to: task.assignedTo.email,
        recipientName: task.assignedTo.vorname,
        taskTitle: task.title,
        taskDescription: task.description || undefined,
        memberName,
        priority: task.priority,
        dueDate: task.dueDate || undefined,
        createdByName,
      }).catch(console.error);
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
