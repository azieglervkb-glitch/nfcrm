import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { generateKpiFeedback } from "@/lib/openai";

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedToId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      member: {
        select: { id: true, vorname: true, nachname: true },
      },
      assignedTo: {
        select: { id: true, vorname: true, nachname: true },
      },
      createdBy: {
        select: { id: true, vorname: true, nachname: true },
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateTaskSchema.parse(body);

    // Build update data
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "COMPLETED") {
        updateData.completedAt = new Date();
      }
    }

    // Get task before update to check if it's a Q2 (Anomalie) task
    const taskBeforeUpdate = await prisma.task.findUnique({
      where: { id },
      include: {
        member: true,
      },
    });

    const wasCompleted = taskBeforeUpdate?.status === "COMPLETED";
    const willBeCompleted = data.status === "COMPLETED";
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        member: {
          select: { id: true, vorname: true, nachname: true },
        },
        assignedTo: {
          select: { id: true, vorname: true, nachname: true },
        },
      },
    });

    // If this is a feedback block task that was just completed, generate AI feedback
    // Check for Q2 (Anomalie), FEEDBACK_BLOCK, or any task related to blocked feedback
    const isFeedbackBlockTask =
      taskBeforeUpdate &&
      (taskBeforeUpdate.ruleId === "Q2" ||
        taskBeforeUpdate.ruleId === "FEEDBACK_BLOCK" ||
        taskBeforeUpdate.title?.includes("KI-Feedback") ||
        taskBeforeUpdate.title?.includes("Feedback"));

    if (
      isFeedbackBlockTask &&
      !wasCompleted &&
      willBeCompleted &&
      taskBeforeUpdate.memberId
    ) {
      // Find the KPI week that was blocked (try current week first, then most recent)
      // Prefer KPI-Woche marker from task description/title if present (prevents unblocking the wrong week)
      const taskText = `${taskBeforeUpdate.title || ""}
${taskBeforeUpdate.description || ""}`;
      const weekMatch = taskText.match(/KPI-Woche\s+(\d+)\/(\d+)/);
      const targetWeekNumber = weekMatch ? Number(weekMatch[1]) : null;
      const targetYear = weekMatch ? Number(weekMatch[2]) : null;

      const currentWeekStart = (() => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + mondayOffset);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
      })();

      // Try to find blocked KPI week (current week first, then most recent)
      let kpiWeek = await prisma.kpiWeek.findFirst({
        where: {
          memberId: taskBeforeUpdate.memberId,
          ...(targetWeekNumber && targetYear
            ? { weekNumber: targetWeekNumber, year: targetYear }
            : { weekStart: currentWeekStart }),
          aiFeedbackBlocked: true,
        },
        include: {
          member: true,
        },
      });

      // If not found, get most recent blocked KPI week
      if (!kpiWeek) {
        kpiWeek = await prisma.kpiWeek.findFirst({
          where: {
            memberId: taskBeforeUpdate.memberId,
            aiFeedbackBlocked: true,
            ...(targetWeekNumber && targetYear
              ? { weekNumber: targetWeekNumber, year: targetYear }
              : {}),
          },
          orderBy: { weekStart: "desc" },
          include: {
            member: true,
          },
        });
      }

      if (kpiWeek && kpiWeek.member) {
        // Generate AI feedback asynchronously
        generateAiFeedbackForBlockedTask(
          kpiWeek.id,
          kpiWeek.member,
          kpiWeek,
          taskBeforeUpdate.ruleId || "FEEDBACK_BLOCK"
        ).catch(console.error);
      }
    }

    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}

// Helper function to generate AI feedback after blocked feedback review
async function generateAiFeedbackForBlockedTask(
  kpiWeekId: string,
  member: any,
  kpiWeek: any,
  triggerRuleId: string
) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      await prisma.kpiWeek.update({
        where: { id: kpiWeekId },
        data: {
          aiFeedbackBlocked: true,
          aiFeedbackBlockReason: "OpenAI API Key nicht konfiguriert",
        },
      });
      console.error("OpenAI API Key not configured");
      return;
    }

    // Generate feedback
    const { text, style } = await generateKpiFeedback(member, kpiWeek);

    // Get delay settings
    const settings = await prisma.systemSettings.findFirst({
      where: { id: "default" },
    });

    const delayMin = settings?.aiFeedbackDelayMin ?? 60;
    const delayMax = settings?.aiFeedbackDelayMax ?? 120;

    // Calculate random delay between min and max
    const delayMinutes = delayMin + Math.random() * (delayMax - delayMin);
    const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);

    // Unblock feedback and save it
    await prisma.kpiWeek.update({
      where: { id: kpiWeekId },
      data: {
        aiFeedbackBlocked: false,
        aiFeedbackBlockReason: null,
        aiFeedbackGenerated: true,
        aiFeedbackText: text,
        aiFeedbackStyle: style,
        aiFeedbackGeneratedAt: new Date(),
        whatsappScheduledFor: member.whatsappNummer ? scheduledFor : null,
      },
    });

    // Remove review flag from member
    await prisma.member.update({
      where: { id: member.id },
      data: { reviewFlag: false },
    });

    // Log the action
    await prisma.automationLog.create({
      data: {
        memberId: member.id,
        ruleId: triggerRuleId,
        ruleName:
          triggerRuleId === "Q2"
            ? "Daten-Anomalie Review"
            : "KI-Feedback Review",
        triggered: true,
        actionsTaken: [
          "REVIEW_COMPLETED",
          "GENERATE_AI_FEEDBACK",
          "UNBLOCK_FEEDBACK",
          "REMOVE_REVIEW_FLAG",
        ],
        details: { kpiWeekId, scheduledFor: scheduledFor.toISOString() },
      },
    });

    console.log(
      `AI feedback generated for KPI ${kpiWeekId} after anomaly review, scheduled for ${scheduledFor.toISOString()} (delay: ${Math.round(delayMinutes)} min)`
    );
  } catch (error: any) {
    const errorMessage = error?.message || "Unbekannter Fehler bei KI-Feedback-Generierung";
    console.error("Error generating AI feedback after anomaly review:", error);

    await prisma.kpiWeek.update({
      where: { id: kpiWeekId },
      data: {
        aiFeedbackBlocked: true,
        aiFeedbackBlockReason: `OpenAI Fehler: ${errorMessage.substring(0, 200)}`,
      },
    });
  }
}
