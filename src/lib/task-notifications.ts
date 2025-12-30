import { prisma } from "@/lib/prisma";
import { isInQuietHours, sendWhatsApp } from "@/lib/whatsapp";
import { sendTaskNotificationEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";

function formatPriority(priority: string | null | undefined): string {
  switch (priority) {
    case "URGENT":
      return "Dringend";
    case "HIGH":
      return "Hoch";
    case "MEDIUM":
      return "Mittel";
    case "LOW":
      return "Niedrig";
    default:
      return "Mittel";
  }
}

export async function notifyTaskAssignee(taskId: string): Promise<void> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        dueDate: true,
        ruleId: true,
        assignedToId: true,
        createdById: true,
        member: {
          select: { vorname: true, nachname: true },
        },
        assignedTo: {
          select: {
            id: true,
            isActive: true,
            email: true,
            vorname: true,
            nachname: true,
            whatsappNummer: true,
            taskWhatsappEnabled: true,
            notifyNewTask: true,
          },
        },
        createdBy: {
          select: {
            vorname: true,
            nachname: true,
          },
        },
      },
    });

    if (!task?.assignedToId || !task.assignedTo) return;
    if (!task.assignedTo.isActive) return;

    // Check if assignee wants task notifications
    if (!task.assignedTo.notifyNewTask) return;

    // Don't notify if the user assigned the task to themselves
    if (task.assignedToId === task.createdById) return;

    const memberName = task.member
      ? `${task.member.vorname} ${task.member.nachname}`
      : null;

    const createdByName = task.createdBy
      ? `${task.createdBy.vorname} ${task.createdBy.nachname}`
      : null;

    const appUrl = getAppUrl();
    const prio = formatPriority(task.priority);

    // Send Email notification
    try {
      await sendTaskNotificationEmail(
        {
          email: task.assignedTo.email,
          vorname: task.assignedTo.vorname,
        },
        {
          title: task.title,
          description: task.description || undefined,
          priority: task.priority || "MEDIUM",
          dueDate: task.dueDate || undefined,
          memberName: memberName || undefined,
          createdByName: createdByName || undefined,
        }
      );
    } catch (error) {
      console.error("Email notification failed:", error);
    }

    // Send WhatsApp notification if enabled
    if (task.assignedTo.taskWhatsappEnabled && task.assignedTo.whatsappNummer) {
      const inQuiet = await isInQuietHours();
      // Only bypass quiet hours for URGENT tasks
      if (!inQuiet || task.priority === "URGENT") {
        const lines: string[] = [];
        lines.push("📋 Neuer Task zugewiesen");
        lines.push(`Titel: ${task.title}`);
        lines.push(`Priorität: ${prio}`);
        if (memberName) lines.push(`Mitglied: ${memberName}`);
        if (createdByName) lines.push(`Von: ${createdByName}`);
        if (task.ruleId) lines.push(`Rule: ${task.ruleId}`);
        if (task.description) lines.push(`Notiz: ${task.description}`);
        lines.push(`Link: ${appUrl}/tasks`);

        await sendWhatsApp({
          phone: task.assignedTo.whatsappNummer,
          message: lines.join("\n"),
          type: "ALERT",
          ruleId: task.ruleId || "TASK",
        });
      }
    }
  } catch (error) {
    console.error("notifyTaskAssignee failed:", error);
  }
}
