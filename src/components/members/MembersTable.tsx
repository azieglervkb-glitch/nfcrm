"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge, getMemberStatusType, FeelingEmoji } from "@/components/common";
import { Eye, MoreHorizontal, TrendingUp, Square } from "lucide-react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Member {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  status: string;
  produkte: string[];
  churnRisk: boolean;
  upsellCandidate: boolean;
  currentFeeling: number | null;
  avgFeeling: number | null;
  currentUmsatz: number | null;
  kpiTrackingEnabled?: boolean;
}

interface MembersTableProps {
  members: Member[];
  onRefresh?: () => void;
}

export function MembersTable({ members, onRefresh }: MembersTableProps) {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  function toggleMemberSelection(memberId: string) {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  }

  function toggleSelectAll() {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map((m) => m.id)));
    }
  }

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
          `${actionLabel}: ${data.results.success} von ${data.results.total} Mitgliedern`
        );

        if (data.results.failed > 0) {
          toast.warning(`${data.results.failed} Fehler aufgetreten`);
        }

        setSelectedMembers(new Set());
        onRefresh?.();
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

  const allSelected = selectedMembers.size === members.length && members.length > 0;
  const someSelected = selectedMembers.size > 0 && selectedMembers.size < members.length;

  return (
    <div>
      {/* Bulk Actions Bar */}
      {selectedMembers.size > 0 && (
        <div className="m-4 mb-0 flex flex-wrap items-center justify-between gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={toggleSelectAll}
              className="border-primary data-[state=checked]:bg-primary"
            />
            <span className="text-sm font-semibold text-primary">
              {selectedMembers.size} ausgewählt
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleBulkAction("activate_kpi_tracking")}
              disabled={processing}
              className="gap-2"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">KPI-Tracking</span> aktivieren
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("deactivate_kpi_tracking")}
              disabled={processing}
              className="gap-2"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">KPI-Tracking</span> deaktivieren
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead>Mitglied</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Produkte</TableHead>
            <TableHead>Feeling (Woche)</TableHead>
            <TableHead>Ø Feeling</TableHead>
            <TableHead>Umsatz (Woche)</TableHead>
            <TableHead>KPI-Tracking</TableHead>
            <TableHead className="w-[100px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8">
                <p className="text-muted-foreground">Keine Mitglieder gefunden</p>
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => {
              const isSelected = selectedMembers.has(member.id);
              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleMemberSelection(member.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/members/${member.id}`}
                      className="flex items-center gap-3 hover:underline"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {member.vorname.charAt(0)}
                          {member.nachname.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.vorname} {member.nachname}
                        </p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <StatusBadge
                        status={getMemberStatusType(member.status)}
                        label={member.status}
                      />
                      {member.churnRisk && (
                        <span className="text-xs text-red-600 font-medium">Churn Risk</span>
                      )}
                      {member.upsellCandidate && (
                        <span className="text-xs text-green-600 font-medium">Upsell Ready</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.produkte.map((product) => (
                        <span
                          key={product}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground"
                        >
                          {product}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.currentFeeling ? (
                      <FeelingEmoji score={member.currentFeeling} size="sm" />
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.avgFeeling ? (
                      <div className="flex items-center gap-1">
                        <FeelingEmoji score={Math.round(member.avgFeeling)} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          ({member.avgFeeling.toFixed(1)})
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.currentUmsatz ? (
                      <span className="font-medium">
                        {Number(member.currentUmsatz).toLocaleString("de-DE", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.kpiTrackingEnabled ? (
                      <span className="text-xs text-green-600 font-medium">Aktiv</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Inaktiv</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/members/${member.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/members/${member.id}`}>Details anzeigen</Link>
                          </DropdownMenuItem>
                          {!member.kpiTrackingEnabled && (
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const res = await fetch(
                                    `/api/members/${member.id}/kpi-tracking`,
                                    {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ enabled: true }),
                                    }
                                  );
                                  if (res.ok) {
                                    toast.success("KPI-Tracking aktiviert");
                                    onRefresh?.();
                                  } else {
                                    toast.error("Fehler beim Aktivieren");
                                  }
                                } catch (error) {
                                  toast.error("Fehler beim Aktivieren");
                                }
                              }}
                            >
                              <TrendingUp className="h-4 w-4 mr-2" />
                              KPI-Tracking aktivieren
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

