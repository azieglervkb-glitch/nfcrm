"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

interface AddNoteDialogProps {
  memberId: string;
  onNoteAdded?: () => void;
}

export function AddNoteDialog({ memberId, onNoteAdded }: AddNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Bitte gib eine Notiz ein");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/members/${memberId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), isPinned }),
      });

      if (!response.ok) {
        throw new Error("Fehler beim Erstellen der Notiz");
      }

      toast.success("Notiz hinzugefügt");
      setContent("");
      setIsPinned(false);
      setOpen(false);
      onNoteAdded?.();
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Fehler beim Hinzufügen der Notiz");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Notiz hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Notiz</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Notiz</Label>
            <Textarea
              id="content"
              placeholder="Notiz eingeben..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="pinned" className="cursor-pointer">
              Notiz anpinnen
            </Label>
            <Switch
              id="pinned"
              checked={isPinned}
              onCheckedChange={setIsPinned}
            />
          </div>

          <div className="flex justify-end gap-2">
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
              Speichern
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

