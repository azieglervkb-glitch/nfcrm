import { SectionHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollText, Zap, TrendingUp, Shield, Users, Calendar } from "lucide-react";
import Link from "next/link";

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
        description: "Erinnerung wenn kein KPI für aktuelle Woche",
        actions: ["E-Mail senden (12:00)", "WhatsApp senden (19:00)"],
        cooldown: "1 Woche",
        active: true,
      },
      {
        id: "R3",
        name: "Leistungsabfall",
        description: "Umsatz < 60% SOLL und Kontakte < SOLL für 2 Wochen",
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
        description: "Performance >= 130% SOLL",
        actions: ["Upsell Flag setzen", "Pipeline-Eintrag erstellen"],
        cooldown: "30 Tage",
        active: true,
      },
      {
        id: "P2",
        name: "Funnel-Leak",
        description: "Hohe Kontakte aber niedrige Konvertierung",
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
        actions: ["Playbook E-Mail senden", "Task erstellen"],
        cooldown: "14 Tage",
        active: true,
      },
      {
        id: "Q2",
        name: "Daten-Anomalie",
        description: "Negative Werte oder unplausible Daten",
        actions: ["AI Feedback blockieren", "Review Flag setzen"],
        cooldown: "Sofort",
        active: true,
      },
      {
        id: "Q3",
        name: "Feld fehlt aber getrackt",
        description: "Aktives Tracking aber leeres Feld",
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
        description: "Heldentat nicht leer",
        actions: ["Gepinnte Notiz erstellen", "Team benachrichtigen"],
        cooldown: "1 Woche",
        active: true,
      },
      {
        id: "C2",
        name: "Blockade aktiv",
        description: "Blockade gemeldet und Feeling <= 5",
        actions: ["AI Feedback blockieren", "Task erstellen"],
        cooldown: "7 Tage",
        active: true,
      },
      {
        id: "C3",
        name: "S.M.A.R.T-Nudge",
        description: "Wochenziele fehlen",
        actions: ["WhatsApp mit Setup-Link senden"],
        cooldown: "1 Woche",
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
        description: "2 Wochen keine KPI oder niedriges Feeling + Performance",
        actions: ["Churn Risk Flag", "Urgent Task erstellen"],
        cooldown: "14 Tage",
        active: true,
      },
      {
        id: "L2",
        name: "Upsell-Fenster",
        description: "Avg. Feeling >= 8 und 3/4 Wochen >= 100%",
        actions: ["Pipeline-Eintrag erstellen", "Task für Sales"],
        cooldown: "30 Tage",
        active: true,
      },
      {
        id: "M1",
        name: "Weekly-Reminder",
        description: "Automatische KPI-Erinnerung Montags",
        actions: ["E-Mail (05:30)", "WhatsApp (19:00 falls nicht eingereicht)"],
        cooldown: "Wöchentlich",
        active: true,
      },
    ],
  },
];

export default function AutomationRulesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Automation Regeln" />
        <Button variant="outline" asChild>
          <Link href="/automations/logs">
            <ScrollText className="mr-2 h-4 w-4" />
            Logs ansehen
          </Link>
        </Button>
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
                        <Switch checked={rule.active} />
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
    </div>
  );
}
