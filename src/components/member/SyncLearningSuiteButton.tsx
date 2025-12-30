"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SyncLearningSuiteButtonProps {
  memberId: string;
  onSync?: () => void;
}

export function SyncLearningSuiteButton({
  memberId,
  onSync,
}: SyncLearningSuiteButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`/api/members/${memberId}/sync-learningsuite`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sync fehlgeschlagen");
      }

      if (data.success) {
        toast({
          title: "Sync erfolgreich",
          description: data.data.currentModule
            ? `Aktuelles Modul: ${data.data.currentModule}`
            : "Member nicht in LearningSuite gefunden",
        });
        onSync?.();
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        toast({
          title: "Sync nicht möglich",
          description: data.message || "Member nicht in LearningSuite gefunden",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Sync fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={syncing}
      className="h-7 text-xs"
    >
      <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? "Sync..." : "Sync"}
    </Button>
  );
}
