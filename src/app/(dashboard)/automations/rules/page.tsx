"use client";

import { useState, useEffect } from "react";
import { SectionHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

export default function AutomationRulesPage() {
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (testDialogOpen && members.length === 0) {
      loadMembers();
    }
  }, [testDialogOpen]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Automation Regeln" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTestDialogOpen(true)}>
            <FlaskConical className="mr-2 h-4 w-4" />
            Regeln testen
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Test Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Automation Regeln testen
            </DialogTitle>
            <DialogDescription>
              Wähle ein Mitglied aus, um zu prüfen welche Regeln aktuell triggern würden.
              Dies ist ein Dry-Run - es werden keine Aktionen ausgeführt.
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
                          {result.details && Object.keys(result.details).length > 0 && (
                            <pre className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          )}
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
    </div>
  );
}
