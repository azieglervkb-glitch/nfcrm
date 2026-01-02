"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteMemberButtonProps {
  memberId: string;
  memberName: string;
  canHardDelete?: boolean;
}

export function DeleteMemberButton({
  memberId,
  memberName,
  canHardDelete = false,
}: DeleteMemberButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteType, setDeleteType] = useState<"soft" | "hard">("soft");

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const url =
        deleteType === "hard"
          ? `/api/members/${memberId}?hard=true`
          : `/api/members/${memberId}`;

      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Löschen");
      }

      router.push("/members");
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error instanceof Error ? error.message : "Fehler beim Löschen");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Löschen
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mitglied löschen?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Möchtest du <strong>{memberName}</strong> wirklich löschen?
            </p>
            {canHardDelete && (
              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="deleteType"
                    checked={deleteType === "soft"}
                    onChange={() => setDeleteType("soft")}
                  />
                  <span>
                    <strong>Soft Delete</strong> - Status wird auf INAKTIV
                    gesetzt (empfohlen)
                  </span>
                </label>
                <label className="flex items-center gap-2 text-destructive">
                  <input
                    type="radio"
                    name="deleteType"
                    checked={deleteType === "hard"}
                    onChange={() => setDeleteType("hard")}
                  />
                  <span>
                    <strong>Hard Delete</strong> - Alle Daten werden permanent
                    gelöscht (KPIs, Tasks, Notizen, etc.)
                  </span>
                </label>
              </div>
            )}
            {!canHardDelete && (
              <p className="text-sm text-muted-foreground">
                Das Mitglied wird auf INAKTIV gesetzt und kann später
                reaktiviert werden.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Löschen...
              </>
            ) : (
              "Löschen"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
