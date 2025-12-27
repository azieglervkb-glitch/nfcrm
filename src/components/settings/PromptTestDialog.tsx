"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, TestTube, User, Calendar, Bot, Copy } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  vorname: string;
  nachname: string;
}

interface KpiWeek {
  id: string;
  weekNumber: number;
  year: number;
  weekStart: string;
}

interface PromptTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromptTestDialog({ open, onOpenChange }: PromptTestDialogProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [kpiWeeks, setKpiWeeks] = useState<KpiWeek[]>([]);
  const [selectedKpiWeekId, setSelectedKpiWeekId] = useState<string>("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingKpiWeeks, setLoadingKpiWeeks] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    style: string;
    member: { id: string; vorname: string };
    kpiWeek: { id: string; weekNumber: number; year: number; weekStart: string };
  } | null>(null);

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open]);

  useEffect(() => {
    if (selectedMemberId) {
      fetchKpiWeeks(selectedMemberId);
    } else {
      setKpiWeeks([]);
      setSelectedKpiWeekId("");
    }
  }, [selectedMemberId]);

  async function fetchMembers() {
    setLoadingMembers(true);
    try {
      const res = await fetch("/api/members?limit=1000");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      toast.error("Fehler beim Laden der Mitglieder");
    } finally {
      setLoadingMembers(false);
    }
  }

  async function fetchKpiWeeks(memberId: string) {
    setLoadingKpiWeeks(true);
    try {
      const res = await fetch(`/api/members/${memberId}`);
      if (res.ok) {
        const data = await res.json();
        const weeks = (data.kpiWeeks || []).map((kpi: any) => ({
          id: kpi.id,
          weekNumber: kpi.weekNumber,
          year: kpi.year,
          weekStart: kpi.weekStart,
        }));
        setKpiWeeks(weeks);
        // Auto-select latest week
        if (weeks.length > 0) {
          setSelectedKpiWeekId(weeks[0].id);
        }
      }
    } catch (error) {
      toast.error("Fehler beim Laden der KPI-Wochen");
    } finally {
      setLoadingKpiWeeks(false);
    }
  }

  async function generateTestFeedback() {
    if (!selectedMemberId) {
      toast.error("Bitte wähle ein Mitglied aus");
      return;
    }

    setGenerating(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/settings/prompts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMemberId,
          kpiWeekId: selectedKpiWeekId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Fehler beim Generieren des Test-Feedbacks");
        return;
      }

      setFeedback(data.feedback);
      toast.success("Test-Feedback erfolgreich generiert");
    } catch (error) {
      toast.error("Fehler beim Generieren des Test-Feedbacks");
    } finally {
      setGenerating(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("In Zwischenablage kopiert");
  }

  function handleClose() {
    onOpenChange(false);
    // Reset state after a short delay to allow animation
    setTimeout(() => {
      setSelectedMemberId("");
      setSelectedKpiWeekId("");
      setKpiWeeks([]);
      setFeedback(null);
    }, 200);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Prompt-Test: KI-Feedback generieren
          </DialogTitle>
          <DialogDescription>
            Wähle ein Mitglied und eine KPI-Woche, um ein Test-Feedback mit den aktuellen Prompts zu generieren.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Member Selection */}
          <div className="space-y-2">
            <Label htmlFor="member-select" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Mitglied
            </Label>
            <Select
              value={selectedMemberId}
              onValueChange={setSelectedMemberId}
              disabled={loadingMembers}
            >
              <SelectTrigger id="member-select">
                <SelectValue placeholder="Mitglied auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.vorname} {member.nachname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* KPI Week Selection */}
          {selectedMemberId && (
            <div className="space-y-2">
              <Label htmlFor="kpi-week-select" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                KPI-Woche
              </Label>
              <Select
                value={selectedKpiWeekId}
                onValueChange={setSelectedKpiWeekId}
                disabled={loadingKpiWeeks || kpiWeeks.length === 0}
              >
                <SelectTrigger id="kpi-week-select">
                  <SelectValue placeholder="KPI-Woche auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {kpiWeeks.map((week) => (
                    <SelectItem key={week.id} value={week.id}>
                      KW {week.weekNumber}/{week.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {kpiWeeks.length === 0 && !loadingKpiWeeks && (
                <p className="text-sm text-muted-foreground">
                  Keine KPI-Wochen für dieses Mitglied gefunden.
                </p>
              )}
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={generateTestFeedback}
            disabled={!selectedMemberId || generating || kpiWeeks.length === 0}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generiere Feedback...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4 mr-2" />
                Test-Feedback generieren
              </>
            )}
          </Button>

          {/* Generated Feedback */}
          {feedback && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Generiertes Feedback</h3>
                  <Badge variant="outline">{feedback.style}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(feedback.text)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Kopieren
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm whitespace-pre-wrap">{feedback.text}</p>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <strong>Mitglied:</strong> {feedback.member.vorname}
                </p>
                <p>
                  <strong>KPI-Woche:</strong> KW {feedback.kpiWeek.weekNumber}/{feedback.kpiWeek.year}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

