"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge, getTaskPriorityType } from "@/components/common";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  MoreVertical,
  Play,
  CheckCircle,
  Trash2,
  RotateCcw,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/date-utils";
import { useRouter } from "next/navigation";

interface TaskMember {
  id: string;
  vorname: string;
  nachname: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  ruleId: string | null;
  member: TaskMember | null;
  assignedTo: TaskMember | null;
}

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateStatus = async (newStatus: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Fehler beim Aktualisieren des Tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      router.refresh();
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Fehler beim Löschen des Tasks");
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
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

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {task.status === "OPEN" && (
                <DropdownMenuItem onClick={() => updateStatus("IN_PROGRESS")}>
                  <Play className="mr-2 h-4 w-4" />
                  In Bearbeitung setzen
                </DropdownMenuItem>
              )}
              {task.status === "IN_PROGRESS" && (
                <DropdownMenuItem onClick={() => updateStatus("OPEN")}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Zurück zu Offen
                </DropdownMenuItem>
              )}
              {(task.status === "OPEN" || task.status === "IN_PROGRESS") && (
                <DropdownMenuItem onClick={() => updateStatus("COMPLETED")}>
                  <CheckCircle className="mr-2 h-4 w-4 text-success" />
                  Als erledigt markieren
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Task löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Bist du sicher, dass du diesen Task löschen möchtest? Diese Aktion
              kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTask}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
