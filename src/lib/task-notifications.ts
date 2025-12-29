import { prisma } from "@/lib/prisma";
import { isInQuietHours, sendWhatsApp } from "@/lib/whatsapp";
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
        ruleId: true,
        assignedToId: true,
        member: {
          select: { vorname: true, nachname: true },
        },
        assignedTo: {
          select: {
            id: true,
            isActive: true,
            vorname: true,
            nachname: true,
            whatsappNummer: true,
            taskWhatsappEnabled: true,
          },
        },
      },
    });

    if (!task?.assignedToId || !task.assignedTo) return;
    if (!task.assignedTo.isActive) return;
    if (!task.assignedTo.taskWhatsappEnabled) return;
    if (!task.assignedTo.whatsappNummer) return;

    const inQuiet = await isInQuietHours();
    // Only bypass quiet hours for URGENT tasks
    if (inQuiet && task.priority !== "URGENT") return;

    const memberName = task.member
      ? `${task.member.vorname} ${task.member.nachname}`
      : null;

    const appUrl = getAppUrl();
    const prio = formatPriority(task.priority);

    const lines: string[] = [];
    lines.push("📋 Neuer Task zugewiesen");
    lines.push(`Titel: ${task.title}`);
    lines.push(`Priorität: ${prio}`);
    if (memberName) lines.push(`Mitglied: ${memberName}`);
    if (task.ruleId) lines.push(`Rule: ${task.ruleId}`);
    if (task.description) lines.push(`Notiz: ${task.description}`);
    lines.push(`Link: ${appUrl}/tasks`);

    await sendWhatsApp({
      phone: task.assignedTo.whatsappNummer,
      message: lines.join("\n"),
      type: "ALERT",
      ruleId: task.ruleId || "TASK",
    });
  } catch (error) {
    console.error("notifyTaskAssignee failed:", error);
  }
}
