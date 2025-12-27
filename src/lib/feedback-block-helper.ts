import { prisma } from "@/lib/prisma";

/**
 * Creates a task when AI feedback is blocked
 * This allows admins to review and manually approve feedback generation
 */
export async function createFeedbackBlockTask(
  kpiWeekId: string,
  memberId: string,
  reason: string,
  ruleId?: string
): Promise<void> {
  try {
    // Check if task already exists for this KPI week
    const existingTask = await prisma.task.findFirst({
      where: {
        memberId,
        ruleId: ruleId || "FEEDBACK_BLOCK",
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      include: {
        member: {
          select: { vorname: true, nachname: true },
        },
      },
    });

    // If task already exists, update it with new reason
    if (existingTask) {
      await prisma.task.update({
        where: { id: existingTask.id },
        data: {
          description: `KI-Feedback blockiert: ${reason}. Bitte prüfen und bei Bestätigung das KI-Feedback freigeben.`,
          priority: "HIGH",
        },
      });
      return;
    }

    // Get member info
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { vorname: true, nachname: true },
    });

    if (!member) {
      console.error(`Member ${memberId} not found for feedback block task`);
      return;
    }

    // Get KPI week info
    const kpiWeek = await prisma.kpiWeek.findUnique({
      where: { id: kpiWeekId },
      select: { weekNumber: true, year: true },
    });

    const weekInfo = kpiWeek
      ? `KPI-Woche ${kpiWeek.weekNumber}/${kpiWeek.year}`
      : "KPI-Woche";

    // Create task
    await prisma.task.create({
      data: {
        memberId,
        title: `KI-Feedback prüfen: ${member.vorname} ${member.nachname}`,
        description: `${weekInfo} - KI-Feedback blockiert: ${reason}. Bitte prüfen und bei Bestätigung das KI-Feedback freigeben.`,
        priority: "HIGH",
        status: "OPEN",
        ruleId: ruleId || "FEEDBACK_BLOCK",
      },
    });

    console.log(`Created feedback block task for member ${memberId}, KPI ${kpiWeekId}, reason: ${reason}`);
  } catch (error) {
    console.error("Error creating feedback block task:", error);
    // Don't throw - task creation failure shouldn't block the main flow
  }
}

