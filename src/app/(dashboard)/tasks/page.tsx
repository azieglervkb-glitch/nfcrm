import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SectionHeader, StatusBadge, getTaskPriorityType } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Clock, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime, formatDate } from "@/lib/date-utils";

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

  const TaskCard = ({
    task,
  }: {
    task: Awaited<ReturnType<typeof getTasks>>["openTasks"][0];
  }) => (
    <div className="p-4 bg-card border border-border rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge
              status={getTaskPriorityType(task.priority)}
              label={task.priority}
            />
            {task.ruleId && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                {task.ruleId}
              </span>
            )}
          </div>
          <h3 className="font-medium truncate">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {task.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        {task.member ? (
          <Link
            href={`/members/${task.member.id}`}
            className="flex items-center gap-2 text-sm hover:underline"
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {task.member.vorname.charAt(0)}
                {task.member.nachname.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span>
              {task.member.vorname} {task.member.nachname}
            </span>
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">Kein Mitglied</span>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(task.dueDate, "dd.MM.")}
            </span>
          )}
          {task.assignedTo && (
            <span>
              {task.assignedTo.vorname.charAt(0)}
              {task.assignedTo.nachname.charAt(0)}
            </span>
          )}
        </div>
      </div>
    </div>
  );

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
