"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

interface Member {
  id: string;
  vorname: string;
  nachname: string;
}

interface TeamMember {
  id: string;
  vorname: string;
  nachname: string;
  role: string;
}

interface CreateTaskDialogProps {
  onTaskCreated?: () => void;
  defaultMemberId?: string;
}

export function CreateTaskDialog({
  onTaskCreated,
  defaultMemberId,
}: CreateTaskDialogProps) {
  const MEMBER_NONE = "__none__";
  const ASSIGNEE_SELF = "__self__";

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    memberId: defaultMemberId || MEMBER_NONE,
    assignedToId: ASSIGNEE_SELF, // "__self__" = assign to self, "all" = create for all team members
    priority: "MEDIUM",
    dueDate: "",
  });

  useEffect(() => {
    if (open) {
      fetchMembers();
      fetchTeamMembers();
    }
  }, [open]);

  async function fetchMembers() {
    setLoadingMembers(true);
    try {
      const response = await fetch("/api/members?limit=1000");
      if (response.ok) {
        const data = await response.json();
        setMembers(Array.isArray(data) ? data : data.members || []);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function fetchTeamMembers() {
    setLoadingTeam(true);
    try {
      const response = await fetch("/api/team");
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching team:", error);
    } finally {
      setLoadingTeam(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Bitte gib einen Titel ein");
      return;
    }

    setLoading(true);

    try {
      // If "all" is selected, create a task for each team member
      if (formData.assignedToId === "all") {
        const promises = teamMembers.map((tm) =>
          fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: formData.title.trim(),
              description: formData.description.trim() || undefined,
              memberId: formData.memberId === MEMBER_NONE ? undefined : formData.memberId,
              assignedToId: tm.id,
              priority: formData.priority,
              dueDate: formData.dueDate || undefined,
            }),
          })
        );
        const results = await Promise.all(promises);
        const failed = results.filter((r) => !r.ok).length;
        if (failed > 0) {
          toast.warning(`${teamMembers.length - failed} Tasks erstellt, ${failed} fehlgeschlagen`);
        } else {
          toast.success(`${teamMembers.length} Tasks erstellt (für alle Team-Mitglieder)`);
        }
      } else {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title.trim(),
            description: formData.description.trim() || undefined,
            memberId: formData.memberId === MEMBER_NONE ? undefined : formData.memberId,
            assignedToId: formData.assignedToId === ASSIGNEE_SELF ? undefined : formData.assignedToId,
            priority: formData.priority,
            dueDate: formData.dueDate || undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Fehler beim Erstellen");
        }

        toast.success("Task erstellt");
      }

      setFormData({
        title: "",
        description: "",
        memberId: defaultMemberId || MEMBER_NONE,
        assignedToId: ASSIGNEE_SELF,
        priority: "MEDIUM",
        dueDate: "",
      });
      setOpen(false);
      onTaskCreated?.();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error(
        error instanceof Error ? error.message : "Fehler beim Erstellen des Tasks"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Task erstellen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Neuer Task</DialogTitle>
          <DialogDescription>
            Erstelle einen neuen Task und weise ihn optional einem Mitglied und/oder Team-Mitglied zu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              placeholder="Task-Titel eingeben..."
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              placeholder="Optionale Beschreibung..."
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="member">Mitglied (betrifft)</Label>
              <Select
                value={formData.memberId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, memberId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MEMBER_NONE}>Kein Mitglied</SelectItem>
                  {loadingMembers ? (
                    <SelectItem value="loading" disabled>
                      Lädt...
                    </SelectItem>
                  ) : (
                    members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.vorname} {member.nachname}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">Zuweisen an</Label>
              <Select
                value={formData.assignedToId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, assignedToId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mir selbst" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ASSIGNEE_SELF}>Mir selbst</SelectItem>
                  <SelectItem value="all">👥 Alle Team-Mitglieder</SelectItem>
                  {loadingTeam ? (
                    <SelectItem value="loading" disabled>
                      Lädt...
                    </SelectItem>
                  ) : (
                    teamMembers.map((tm) => (
                      <SelectItem key={tm.id} value={tm.id}>
                        {tm.vorname} {tm.nachname}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priorität</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Niedrig</SelectItem>
                  <SelectItem value="MEDIUM">Mittel</SelectItem>
                  <SelectItem value="HIGH">Hoch</SelectItem>
                  <SelectItem value="URGENT">Dringend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Fällig am</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Erstellen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

