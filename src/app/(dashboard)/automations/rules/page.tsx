"use client";

import { useState, useEffect } from "react";
import { SectionHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScrollText,
  Zap,
  TrendingUp,
  Shield,
  Users,
  Calendar,
  FlaskConical,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const automationRules = [
  {
    category: "Risiko & Retention",
    icon: Shield,
    rules: [
      {
        id: "R1",
        name: "Low-Feeling-Streak",
        description: "Trigger bei Feeling < 5 für 3 Wochen in Folge",
        actions: ["Review Flag setzen", "Task erstellen", "Coach benachrichtigen"],
        cooldown: "7 Tage",
        active: true,
      },
      {
        id: "R2",
        name: "Silent Member",
        description: "Erinnerung wenn kein KPI für aktuelle Woche (Cron-Job)",
        actions: ["E-Mail senden", "WhatsApp senden"],
        cooldown: "48 Stunden",
        active: true,
      },
      {
        id: "R3",
        name: "Leistungsabfall",
        description: "Umsatz < 60% SOLL UND Kontakte < SOLL für 2 Wochen",
        actions: ["Danger Zone Flag", "Urgent Task erstellen"],
        cooldown: "14 Tage",
        active: true,
      },
    ],
  },
  {
    category: "Performance & Upside",
    icon: TrendingUp,
    rules: [
      {
        id: "P1",
        name: "Upsell-Signal",
        description: "12 Wochen (3 Monate) in Folge >= 20.000€ Monatsumsatz",
        actions: ["Upsell Flag setzen", "Pipeline-Eintrag erstellen"],
        cooldown: "30 Tage",
        active: true,
      },
      {
        id: "P2",
        name: "Funnel-Leak",
        description: "Kontakte OK aber Entscheider < 30% oder Termine < 70%",
        actions: ["Task erstellen", "Notiz hinzufügen"],
        cooldown: "7 Tage",
        active: true,
      },
      {
        id: "P3",
        name: "Momentum-Streak",
        description: "3 Wochen in Folge >= 100% bei mind. 2 KPIs",
        actions: ["Feier-Nachricht senden", "Notiz hinzufügen"],
        cooldown: "30 Tage",
        active: true,
      },
    ],
  },
  {
    category: "Qualität & Hygiene",
    icon: Zap,
    rules: [
      {
        id: "Q1",
        name: "No-Show hoch",
        description: "No-Show-Quote >= 30%",
        actions: ["Task erstellen"],
        cooldown: "14 Tage",
        active: true,
      },
      {
        id: "Q2",
        name: "Daten-Anomalie",
        description: "Negative Werte, Umsatz > 200k, oder unlogische Daten",
        actions: ["AI Feedback blockieren", "Review Flag setzen"],
        cooldown: "Sofort",
        active: true,
      },
      {
        id: "Q3",
        name: "Feld fehlt aber getrackt",
        description: "Aktives Tracking aber leeres Pflichtfeld",
        actions: ["WhatsApp Nudge senden"],
        cooldown: "1x pro Feld/Woche",
        active: true,
      },
    ],
  },
  {
    category: "Coaching-Flow",
    icon: Users,
    rules: [
      {
        id: "C1",
        name: "Heldentat-Amplify",
        description: "Heldentat-Feld ausgefüllt",
        actions: ["Gepinnte Notiz erstellen"],
        cooldown: "7 Tage",
        active: true,
      },
      {
        id: "C2",
        name: "Blockade aktiv",
        description: "Blockade gemeldet UND Feeling <= 5",
        actions: ["AI Feedback blockieren", "Task erstellen"],
        cooldown: "7 Tage",
        active: true,
      },
      {
        id: "C3",
        name: "S.M.A.R.T-Nudge",
        description: "Keine Wochenziele (Umsatz, Einheiten, Kontakte) definiert",
        actions: ["WhatsApp mit Setup-Link senden"],
        cooldown: "7 Tage",
        active: true,
      },
    ],
  },
  {
    category: "Lifecycle",
    icon: Calendar,
    rules: [
      {
        id: "L1",
        name: "Kündigungsrisiko",
        description: "Keine KPIs ODER Feeling <= 4 + Umsatz < 50%",
        actions: ["Churn Risk Flag", "Urgent Task erstellen"],
        cooldown: "14 Tage",
        active: true,
      },
      {
        id: "L2",
        name: "Happy High Performer",
        description: "Feeling >= 8 UND Umsatzziel erreicht",
        actions: ["Upsell Flag", "Pipeline-Eintrag", "Notiz"],
        cooldown: "30 Tage",
        active: true,
      },
      {
        id: "M1",
        name: "Weekly-Reminder",
        description: "Automatische KPI-Erinnerung (Cron-Job)",
        actions: ["E-Mail (morgens)", "WhatsApp (abends falls nicht eingereicht)"],
        cooldown: "20 Stunden",
        active: true,
      },
    ],
  },
];

interface Member {
  id: string;
  vorname: string;
  nachname: string;
}

interface TestResult {
  ruleId: string;
  ruleName: string;
  wouldTrigger: boolean;
  reason: string;
  details?: Record<string, any>;
}

interface ExecuteResult {
  success: boolean;
  executed: boolean;
  error?: string;
  triggered: boolean;
  ruleId: string;
  log?: {
    id: string;
    actionsTaken: string[];
    details: any;
    createdAt: string;
  };
  cooldown?: {
    expiresAt: string;
    isActive: boolean;
  };
  effects: {
    tasksCreated: Array<{ id: string; title: string; priority: string }>;
    notesCreated: Array<{ id: string; content: string; isPinned: boolean }>;
  };
}

export default function AutomationRulesPage() {
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [clearCooldown, setClearCooldown] = useState(true);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if ((testDialogOpen || executeDialogOpen) && members.length === 0) {
      loadMembers();
    }
  }, [testDialogOpen, executeDialogOpen]);

  async function loadMembers() {
    setLoadingMembers(true);
    try {
      const response = await fetch("/api/members?limit=200");
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function runTest() {
    if (!selectedMemberId) {
      toast.error("Bitte wähle ein Mitglied aus");
      return;
    }

    setTesting(true);
    setTestResults([]);

    try {
      const response = await fetch("/api/automations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedMemberId }),
      });

      if (response.ok) {
        const data = await response.json();
        setTestResults(data.results);
        toast.success("Test abgeschlossen");
      } else {
        toast.error("Fehler beim Testen");
      }
    } catch (error) {
      console.error("Test error:", error);
      toast.error("Fehler beim Testen");
    } finally {
      setTesting(false);
    }
  }

  async function executeRule() {
    if (!selectedMemberId || !selectedRuleId) {
      toast.error("Bitte wähle Mitglied und Regel aus");
      return;
    }

    setExecuting(true);
    setExecuteResult(null);

    try {
      const response = await fetch("/api/automations/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMemberId,
          ruleId: selectedRuleId,
          clearCooldown,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExecuteResult(data);
        if (data.triggered) {
          toast.success("Regel wurde ausgeführt!");
        } else if (data.executed) {
          toast.info("Regel wurde geprüft, aber nicht getriggert");
        } else {
          toast.error(data.error || "Fehler bei der Ausführung");
        }
      } else {
        toast.error("Fehler beim Ausführen");
      }
    } catch (error) {
      console.error("Execute error:", error);
      toast.error("Fehler beim Ausführen");
    } finally {
      setExecuting(false);
    }
  }

  function openExecuteDialog(ruleId: string) {
    setSelectedRuleId(ruleId);
    setExecuteResult(null);
    setExecuteDialogOpen(true);
  }

  const selectedRule = automationRules
    .flatMap((c) => c.rules)
    .find((r) => r.id === selectedRuleId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Automation Regeln" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTestDialogOpen(true)}>
            <FlaskConical className="mr-2 h-4 w-4" />
            Alle testen
          </Button>
          <Button variant="outline" asChild>
            <Link href="/automations/logs">
              <ScrollText className="mr-2 h-4 w-4" />
              Logs ansehen
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {automationRules.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.category}>
              <div className="flex items-center gap-2 mb-4">
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{category.category}</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {category.rules.map((rule) => (
                  <Card key={rule.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="font-mono font-bold"
                          >
                            {rule.id}
                          </Badge>
                          <CardTitle className="text-base">{rule.name}</CardTitle>
                        </div>
                        <Switch checked={rule.active} disabled />
                      </div>
                      <CardDescription>{rule.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Aktionen
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {rule.actions.map((action, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-muted px-2 py-1 rounded"
                              >
                                {action}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Cooldown</span>
                          <span className="font-medium">{rule.cooldown}</span>
                        </div>
                        {rule.id !== "M1" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => openExecuteDialog(rule.id)}
                          >
                            <Play className="h-3 w-3 mr-2" />
                            Live ausführen
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dry-Run Test Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Alle Regeln testen (Dry-Run)
            </DialogTitle>
            <DialogDescription>
              Prüft welche Regeln für ein Mitglied triggern würden - ohne Aktionen auszuführen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Select
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={loadingMembers ? "Lade..." : "Mitglied auswählen"} />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.vorname} {member.nachname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={runTest} disabled={testing || !selectedMemberId}>
                {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Testen
              </Button>
            </div>

            {testResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Ergebnisse:</h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {testResults.map((result) => (
                    <div
                      key={result.ruleId}
                      className={`
                        p-3 rounded-lg border
                        ${result.wouldTrigger
                          ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                          : "bg-muted/50 border-border"
                        }
                      `}
                    >
                      <div className="flex items-start gap-2">
                        {result.wouldTrigger ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {result.ruleId}
                            </Badge>
                            <span className="font-medium text-sm">{result.ruleName}</span>
                            {result.wouldTrigger && (
                              <Badge className="bg-green-600 text-xs">Würde triggern</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {result.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {testResults.filter((r) => r.wouldTrigger).length} von {testResults.length} Regeln würden triggern
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Live Execute Dialog */}
      <Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Regel live ausführen
            </DialogTitle>
            <DialogDescription>
              {selectedRule && (
                <>
                  <Badge variant="outline" className="font-mono mr-2">
                    {selectedRule.id}
                  </Badge>
                  {selectedRule.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Live-Ausführung
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Dies führt die Regel wirklich aus! Tasks werden erstellt, Nachrichten gesendet, Flags gesetzt.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Select
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingMembers ? "Lade..." : "Mitglied auswählen"} />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.vorname} {member.nachname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <label className="flex items-center gap-2">
                <Checkbox
                  checked={clearCooldown}
                  onCheckedChange={(v) => setClearCooldown(v === true)}
                />
                <span className="text-sm">Cooldown zurücksetzen (für wiederholtes Testen)</span>
              </label>
            </div>

            {executeResult && (
              <div className={`
                p-4 rounded-lg border
                ${executeResult.triggered
                  ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                  : executeResult.error
                  ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                  : "bg-muted/50 border-border"
                }
              `}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {executeResult.triggered ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-800 dark:text-green-200">
                          Regel wurde ausgeführt!
                        </span>
                      </>
                    ) : executeResult.error ? (
                      <>
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-800 dark:text-red-200">
                          Fehler: {executeResult.error}
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">
                          Regel geprüft, aber Bedingungen nicht erfüllt
                        </span>
                      </>
                    )}
                  </div>

                  {executeResult.log && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Ausgeführte Aktionen:</p>
                      <div className="flex flex-wrap gap-1">
                        {executeResult.log.actionsTaken.map((action, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {executeResult.effects.tasksCreated.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Erstellte Tasks:</p>
                      {executeResult.effects.tasksCreated.map((task) => (
                        <div key={task.id} className="text-sm flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                          {task.title}
                        </div>
                      ))}
                    </div>
                  )}

                  {executeResult.effects.notesCreated.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Erstellte Notizen:</p>
                      {executeResult.effects.notesCreated.map((note) => (
                        <div key={note.id} className="text-sm">
                          {note.isPinned && <Badge className="mr-1 text-xs">Gepinnt</Badge>}
                          {note.content}...
                        </div>
                      ))}
                    </div>
                  )}

                  {executeResult.cooldown?.isActive && (
                    <p className="text-xs text-muted-foreground">
                      Cooldown aktiv bis: {new Date(executeResult.cooldown.expiresAt).toLocaleString("de-DE")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExecuteDialogOpen(false)}>
              Schließen
            </Button>
            <Button
              onClick={executeRule}
              disabled={executing || !selectedMemberId}
              variant="destructive"
            >
              {executing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Jetzt ausführen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
