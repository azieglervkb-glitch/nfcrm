"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Play, Square, CheckSquare, TrendingUp } from "lucide-react";

interface MemberBulkActionsProps {
  onActionComplete?: () => void;
}

export function MemberBulkActions({ onActionComplete }: MemberBulkActionsProps) {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  async function handleBulkAction(action: "activate_kpi_tracking" | "deactivate_kpi_tracking") {
    if (selectedMembers.size === 0) {
      toast.error("Bitte wähle mindestens ein Mitglied aus");
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch("/api/members/bulk-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          memberIds: Array.from(selectedMembers),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const actionLabel =
          action === "activate_kpi_tracking"
            ? "KPI-Tracking aktiviert"
            : "KPI-Tracking deaktiviert";

        toast.success(
          `${actionLabel}: ${data.results.activated || data.results.deactivated} Mitglieder`
        );

        if (data.results.errors > 0) {
          toast.warning(`${data.results.errors} Fehler aufgetreten`);
        }

        setSelectedMembers(new Set());
        setSelectAll(false);
        onActionComplete?.();
      } else {
        toast.error(data.error || "Fehler bei Bulk-Aktion");
      }
    } catch (error) {
      console.error("Bulk action error:", error);
      toast.error("Fehler bei Bulk-Aktion");
    } finally {
      setProcessing(false);
    }
  }

  function toggleMemberSelection(memberId: string) {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
    setSelectAll(false);
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelectedMembers(new Set());
      setSelectAll(false);
    } else {
      // Select all visible members - this would need to be passed as prop
      // For now, we'll just clear selection
      setSelectedMembers(new Set());
      setSelectAll(true);
    }
  }

  if (selectedMembers.size === 0 && !selectAll) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectAll}
          onCheckedChange={toggleSelectAll}
        />
        <span className="text-sm font-medium">
          {selectedMembers.size > 0
            ? `${selectedMembers.size} ausgewählt`
            : "Alle auswählen"}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={processing}>
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4 mr-2" />
              )}
              Aktionen ({selectedMembers.size})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleBulkAction("activate_kpi_tracking")}
              disabled={processing}
            >
              <Play className="h-4 w-4 mr-2" />
              KPI-Tracking aktivieren
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleBulkAction("deactivate_kpi_tracking")}
              disabled={processing}
            >
              <Square className="h-4 w-4 mr-2" />
              KPI-Tracking deaktivieren
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

