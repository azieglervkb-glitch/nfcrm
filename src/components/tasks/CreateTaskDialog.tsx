"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

interface CreateTaskDialogProps {
  onTaskCreated?: () => void;
  defaultMemberId?: string;
}

export function CreateTaskDialog({
  onTaskCreated,
  defaultMemberId,
}: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    memberId: defaultMemberId || "",
    priority: "MEDIUM",
    dueDate: "",
  });

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open]);

  async function fetchMembers() {
    setLoadingMembers(true);
    try {
      const response = await fetch("/api/members");
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoadingMembers(false);
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
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          memberId: formData.memberId || undefined,
          priority: formData.priority,
          dueDate: formData.dueDate || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Fehler beim Erstellen");
      }

      toast.success("Task erstellt");
      setFormData({
        title: "",
        description: "",
        memberId: defaultMemberId || "",
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
              <Label htmlFor="member">Mitglied</Label>
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
                  <SelectItem value="">Kein Mitglied</SelectItem>
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

