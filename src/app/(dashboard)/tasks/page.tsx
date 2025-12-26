import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SectionHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Clock, CheckCircle2, Circle } from "lucide-react";
import { TaskCard } from "@/components/tasks/task-card";

async function getTasks() {
  const session = await auth();

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

  const openTasks = tasks.filter((t) => t.status === "OPEN");
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");

  return { openTasks, inProgressTasks, currentUserId: session?.user.id };
}

export default async function TasksPage() {
  const { openTasks, inProgressTasks, currentUserId } = await getTasks();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Tasks" />
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Task erstellen
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Open */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Circle className="h-4 w-4 text-muted-foreground" />
              Offen
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {openTasks.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine offenen Tasks
              </p>
            ) : (
              openTasks.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              In Bearbeitung
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {inProgressTasks.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inProgressTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine Tasks in Bearbeitung
              </p>
            ) : (
              inProgressTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Übersicht
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold text-warning">
                  {openTasks.filter((t) => t.priority === "URGENT").length}
                </p>
                <p className="text-sm text-muted-foreground">Dringend</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold text-danger">
                  {openTasks.filter((t) => t.priority === "HIGH").length}
                </p>
                <p className="text-sm text-muted-foreground">Hoch</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Letzte Automationen</h4>
              <div className="space-y-2">
                {openTasks
                  .filter((t) => t.ruleId)
                  .slice(0, 3)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="font-medium text-primary">
                        {task.ruleId}
                      </span>
                      <span className="text-muted-foreground truncate">
                        {task.title}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
