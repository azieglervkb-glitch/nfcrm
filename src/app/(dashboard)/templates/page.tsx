"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  MessageSquare,
  Loader2,
  Save,
  Eye,
  Code,
  Edit3,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  channel: "EMAIL" | "WHATSAPP";
  subject: string | null;
  content: string;
  variables: string[];
  isActive: boolean;
  updatedAt: string;
}

// Default templates that should exist
const DEFAULT_TEMPLATES: Omit<EmailTemplate, "id" | "updatedAt">[] = [
  {
    slug: "kpi_reminder",
    name: "KPI Erinnerung",
    channel: "EMAIL",
    subject: "📊 Deine KPIs für KW{{weekNumber}} fehlen noch",
    content: `<div class="content">
  <p class="greeting">Hey {{vorname}}! 👋</p>

  <p class="text">
    Wir haben bemerkt, dass deine KPIs für <strong>Kalenderwoche {{weekNumber}}</strong> noch nicht eingetragen sind.
  </p>

  <p class="text">
    Deine wöchentlichen Zahlen zu tracken ist der Schlüssel zu deinem Erfolg.
    Es dauert nur 2 Minuten und hilft dir, deine Fortschritte zu sehen.
  </p>

  <div style="text-align: center;">
    <a href="{{formLink}}" class="button">Jetzt KPIs eintragen →</a>
  </div>

  <div class="tip">
    <div class="tip-title">💡 Tipp</div>
    <p style="margin: 0; color: #166534;">
      Trag deine Zahlen am besten jeden Freitag ein – so hast du alles noch frisch im Kopf!
    </p>
  </div>

  <p class="text" style="margin-top: 24px;">
    Falls du Fragen hast oder Hilfe brauchst, melde dich jederzeit bei deinem Coach.
  </p>
</div>`,
    variables: ["vorname", "weekNumber", "formLink"],
    isActive: true,
  },
  {
    slug: "weekly_feedback",
    name: "Wöchentliches Feedback",
    channel: "EMAIL",
    subject: "{{goalEmoji}} Dein Feedback für KW{{weekNumber}}",
    content: `<div class="content">
  <p class="greeting">
    {{goalEmoji}} Hey {{vorname}}!
  </p>

  <p class="text">
    Hier ist dein persönliches Feedback für <strong>Kalenderwoche {{weekNumber}}</strong>:
  </p>

  <div class="stats-box">
    <div style="text-align: center; margin-bottom: 16px;">
      <div style="font-size: 36px; font-weight: bold; color: {{performanceColor}};">
        {{performancePercent}}%
      </div>
      <div style="color: #6b6b6b; font-size: 14px;">Zielerreichung</div>
    </div>
    <div class="stats-row">
      <span class="stats-label">Umsatz IST</span>
      <span class="stats-value">{{umsatzIst}}</span>
    </div>
    <div class="stats-row">
      <span class="stats-label">Umsatz SOLL</span>
      <span class="stats-value">{{umsatzSoll}}</span>
    </div>
  </div>

  <div class="highlight-box">
    <p style="margin: 0; white-space: pre-wrap;">{{feedback}}</p>
  </div>

  <div style="text-align: center;">
    <a href="{{dashboardLink}}" class="button">Dashboard öffnen</a>
  </div>
</div>`,
    variables: ["vorname", "weekNumber", "goalEmoji", "performanceColor", "performancePercent", "umsatzIst", "umsatzSoll", "feedback", "dashboardLink"],
    isActive: true,
  },
  {
    slug: "welcome_email",
    name: "Willkommens-Email",
    channel: "EMAIL",
    subject: "🚀 Willkommen im NF Mentoring!",
    content: `<div class="content">
  <p class="greeting">Willkommen im NF Mentoring, {{vorname}}! 🚀</p>

  <p class="text">
    Wir freuen uns riesig, dich an Bord zu haben! Du hast den ersten wichtigen Schritt gemacht
    – jetzt geht's richtig los.
  </p>

  <div class="highlight-box">
    <p style="margin: 0;">
      <strong>Dein nächster Schritt:</strong><br>
      Richte dein persönliches KPI-Tracking ein, damit wir deine Fortschritte optimal begleiten können.
    </p>
  </div>

  <div style="text-align: center;">
    <a href="{{kpiSetupLink}}" class="button">KPI-Tracking einrichten →</a>
  </div>

  <div class="divider"></div>

  <p class="text"><strong>Was dich erwartet:</strong></p>
  <ul style="color: #4a4a4a;">
    <li>Wöchentliches KPI-Tracking mit persönlichem Feedback</li>
    <li>Regelmäßige Check-ins mit deinem Coach</li>
    <li>Zugang zu exklusiven Ressourcen und Trainings</li>
    <li>Eine Community von Gleichgesinnten</li>
  </ul>

  <p class="text" style="margin-top: 24px;">
    Bei Fragen sind wir jederzeit für dich da!
  </p>

  <p class="text">
    Auf deinen Erfolg! 💪<br>
    <strong>Dein NF Mentoring Team</strong>
  </p>
</div>`,
    variables: ["vorname", "nachname", "kpiSetupLink"],
    isActive: true,
  },
  {
    slug: "churn_warning",
    name: "Churn-Warnung",
    channel: "EMAIL",
    subject: "{{vorname}}, wir vermissen dich!",
    content: `<div class="content">
  <p class="greeting">Hey {{vorname}},</p>

  <p class="text">
    uns ist aufgefallen, dass du schon <strong>{{weeksInactive}} Wochen</strong> keine KPIs mehr eingetragen hast.
  </p>

  <div class="warning">
    <div class="warning-title">⚠️ Wir machen uns Sorgen</div>
    <p style="margin: 0; color: #92400e;">
      Ist alles in Ordnung? Können wir dir irgendwie helfen?
    </p>
  </div>

  <p class="text">
    Wir wissen, dass manchmal viel los ist. Aber gerade in stressigen Zeiten ist es wichtig,
    den Überblick zu behalten. Dein Coach ist für dich da!
  </p>

  <p class="text">
    <strong>Mögliche nächste Schritte:</strong>
  </p>
  <ul style="color: #4a4a4a;">
    <li>Melde dich bei deinem Coach für ein kurzes Gespräch</li>
    <li>Trag deine KPIs ein – auch wenn die Woche nicht perfekt war</li>
    <li>Schreib uns, wenn du eine Pause brauchst</li>
  </ul>

  <div style="text-align: center;">
    <a href="mailto:support@nf-mentoring.de?subject=Ich brauche Unterstützung" class="button">Coach kontaktieren</a>
  </div>

  <p class="text" style="margin-top: 24px;">
    Wir sind hier, um dich zu unterstützen – nicht um zu urteilen.
    Lass uns gemeinsam schauen, wie wir weitermachen können.
  </p>

  <p class="text">
    Alles Gute,<br>
    <strong>Dein NF Mentoring Team</strong>
  </p>
</div>`,
    variables: ["vorname", "weeksInactive"],
    isActive: true,
  },
  {
    slug: "goal_celebration",
    name: "Ziel erreicht!",
    channel: "EMAIL",
    subject: "🎉 Ziel erreicht! {{umsatzIst}} in KW{{weekNumber}}",
    content: `<div class="content">
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="font-size: 64px;">🎉</div>
  </div>

  <p class="greeting" style="text-align: center;">
    Mega, {{vorname}}!
  </p>

  <p class="text" style="text-align: center; font-size: 18px;">
    Du hast dein Wochenziel für <strong>KW{{weekNumber}}</strong> erreicht!
  </p>

  <div class="stats-box" style="text-align: center;">
    <div style="font-size: 42px; font-weight: bold; color: #16a34a;">
      {{umsatzIst}}
    </div>
    <div style="color: #6b6b6b; margin-top: 8px;">
      {{overachievementText}}
    </div>
    {{streakHtml}}
  </div>

  <div class="highlight-box">
    <p style="margin: 0;">
      <strong>Weiter so!</strong> Deine Konstanz zahlt sich aus. Jede Woche, in der du deine Ziele erreichst,
      bringt dich deinem großen Ziel näher.
    </p>
  </div>

  <p class="text" style="text-align: center;">
    Erzähl uns von deiner Erfolgsformel! Was hat diese Woche besonders gut geklappt?
  </p>

  <div style="text-align: center;">
    <a href="{{dashboardLink}}" class="button">Zum Dashboard</a>
  </div>
</div>`,
    variables: ["vorname", "weekNumber", "umsatzIst", "overachievementText", "streakHtml", "dashboardLink"],
    isActive: true,
  },
  {
    slug: "coach_task",
    name: "Coach Aufgaben-Benachrichtigung",
    channel: "EMAIL",
    subject: "{{priorityEmoji}} Neue Aufgabe: {{taskTitle}}",
    content: `<div class="content">
  <p class="greeting">Hey {{coachVorname}},</p>

  <p class="text">
    Eine neue Aufgabe wurde für dich erstellt:
  </p>

  <div class="stats-box">
    <div style="margin-bottom: 12px;">
      <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; background: {{priorityColor}}; color: white; font-size: 12px; font-weight: 600;">
        {{priorityLabel}}
      </span>
    </div>
    <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">
      {{taskTitle}}
    </div>
    <div style="color: #6b6b6b; font-size: 14px;">
      Mitglied: {{memberName}}
    </div>
    {{taskDescriptionHtml}}
  </div>

  <div style="text-align: center;">
    <a href="{{tasksLink}}" class="button">Aufgaben ansehen</a>
  </div>
</div>`,
    variables: ["coachVorname", "taskTitle", "memberName", "priorityEmoji", "priorityColor", "priorityLabel", "taskDescriptionHtml", "tasksLink"],
    isActive: true,
  },
  {
    slug: "whatsapp_kpi_reminder",
    name: "WhatsApp KPI Erinnerung",
    channel: "WHATSAPP",
    subject: null,
    content: `Hey {{vorname}}! 👋

Deine KPIs für KW{{weekNumber}} fehlen noch. Nimm dir 2 Minuten und trag deine Zahlen ein:

{{formLink}}

Keep pushing! 💪`,
    variables: ["vorname", "weekNumber", "formLink"],
    isActive: true,
  },
  {
    slug: "whatsapp_goal_celebration",
    name: "WhatsApp Ziel erreicht",
    channel: "WHATSAPP",
    subject: null,
    content: `🎉 MEGA, {{vorname}}!

Du hast dein Wochenziel erreicht: {{umsatzIst}}

{{streakText}}

Weiter so! 🚀`,
    variables: ["vorname", "umsatzIst", "streakText"],
    isActive: true,
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        setTemplates([]);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const initializeTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/templates/initialize", { method: "POST" });
      if (response.ok) {
        toast({
          title: "Templates initialisiert",
          description: "Alle Standard-Templates wurden erstellt.",
        });
        fetchTemplates();
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Templates konnten nicht initialisiert werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedContent(template.content);
    setEditedSubject(template.subject || "");
    setEditMode(false);
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editedContent,
          subject: editedSubject || null,
        }),
      });

      if (response.ok) {
        toast({
          title: "Gespeichert",
          description: "Template wurde aktualisiert.",
        });
        setEditMode(false);
        fetchTemplates();
        // Update local state
        setSelectedTemplate({
          ...selectedTemplate,
          content: editedContent,
          subject: editedSubject || null,
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Template konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleTemplateActive = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !template.isActive }),
      });

      if (response.ok) {
        fetchTemplates();
        toast({
          title: template.isActive ? "Deaktiviert" : "Aktiviert",
          description: `Template "${template.name}" wurde ${template.isActive ? "deaktiviert" : "aktiviert"}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Status konnte nicht geändert werden.",
        variant: "destructive",
      });
    }
  };

  const getPreviewHtml = () => {
    if (!selectedTemplate) return "";

    // Replace variables with example values for preview
    let preview = editedContent;
    const exampleValues: Record<string, string> = {
      vorname: "Max",
      nachname: "Mustermann",
      weekNumber: "51",
      formLink: "https://example.com/form/abc123",
      dashboardLink: "https://example.com/dashboard",
      kpiSetupLink: "https://example.com/kpi-setup",
      feedback: "Tolle Woche! Du hast deine Ziele übertroffen und zeigst konstant gute Leistungen.",
      umsatzIst: "5.500 €",
      umsatzSoll: "5.000 €",
      performancePercent: "110",
      performanceColor: "#16a34a",
      goalEmoji: "🎉",
      weeksInactive: "3",
      overachievementText: "+10% über deinem Ziel!",
      streakHtml: '<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e5e5;"><span style="font-size: 24px;">🔥</span><span style="font-weight: 600; color: #ae1d2b;"> 4 Wochen Streak!</span></div>',
      streakText: "Das sind jetzt 4 Wochen in Folge! 🔥",
      coachVorname: "Sarah",
      taskTitle: "Retention-Call vereinbaren",
      memberName: "Max Mustermann",
      priorityEmoji: "🚨",
      priorityColor: "#ae1d2b",
      priorityLabel: "Hoch",
      taskDescriptionHtml: '<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e5e5; color: #4a4a4a;">Mitglied zeigt Anzeichen von Churn-Risiko.</div>',
      tasksLink: "https://example.com/tasks",
    };

    for (const [key, value] of Object.entries(exampleValues)) {
      preview = preview.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    if (selectedTemplate.channel === "EMAIL") {
      return `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 32px; text-align: center; }
            .logo-text { color: #ffffff; font-size: 24px; font-weight: bold; }
            .content { padding: 32px; }
            .greeting { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }
            .text { color: #4a4a4a; margin-bottom: 16px; }
            .button { display: inline-block; background: #ae1d2b; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
            .stats-box { background: #f8f8f8; border-radius: 12px; padding: 20px; margin: 24px 0; }
            .stats-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
            .stats-row:last-child { border-bottom: none; }
            .stats-label { color: #6b6b6b; }
            .stats-value { font-weight: 600; color: #1a1a1a; }
            .highlight-box { background: linear-gradient(135deg, #fdf2f3 0%, #fff5f5 100%); border-left: 4px solid #ae1d2b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0; }
            .footer { background: #f8f8f8; padding: 24px 32px; text-align: center; color: #6b6b6b; font-size: 14px; }
            .divider { height: 1px; background: #e5e5e5; margin: 24px 0; }
            .tip { background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .tip-title { color: #166534; font-weight: 600; margin-bottom: 8px; }
            .warning { background: #fef3c7; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .warning-title { color: #92400e; font-weight: 600; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="logo-text">NF Mentoring</span>
            </div>
            ${preview}
            <div class="footer">
              <p>Du erhältst diese E-Mail als Mitglied des NF Mentorings.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    return preview;
  };

  const emailTemplates = templates.filter(t => t.channel === "EMAIL");
  const whatsappTemplates = templates.filter(t => t.channel === "WHATSAPP");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">E-Mail & WhatsApp Templates</h1>
          <p className="text-gray-600">
            Verwalte die Vorlagen für automatische Nachrichten
          </p>
        </div>
        {templates.length === 0 && (
          <Button onClick={initializeTemplates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Standard-Templates laden
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1 space-y-4">
          <Tabs defaultValue="email">
            <TabsList className="w-full">
              <TabsTrigger value="email" className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                E-Mail ({emailTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" />
                WhatsApp ({whatsappTemplates.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-2 mt-4">
              {emailTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedTemplate?.id === template.id ? "ring-2 ring-red-500" : ""
                  }`}
                  onClick={() => selectTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-gray-500 truncate max-w-[200px]">
                          {template.subject}
                        </p>
                      </div>
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {emailTemplates.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  Keine E-Mail Templates vorhanden
                </p>
              )}
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-2 mt-4">
              {whatsappTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedTemplate?.id === template.id ? "ring-2 ring-red-500" : ""
                  }`}
                  onClick={() => selectTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-gray-500">
                          {(template.variables || []).length} Variablen
                        </p>
                      </div>
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {whatsappTemplates.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  Keine WhatsApp Templates vorhanden
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedTemplate.channel === "EMAIL" ? (
                        <Mail className="h-5 w-5" />
                      ) : (
                        <MessageSquare className="h-5 w-5" />
                      )}
                      {selectedTemplate.name}
                    </CardTitle>
                    <CardDescription>
                      Slug: <code className="bg-gray-100 px-1 rounded">{selectedTemplate.slug}</code>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="active-switch" className="text-sm text-gray-600">
                        Aktiv
                      </Label>
                      <Switch
                        id="active-switch"
                        checked={selectedTemplate.isActive}
                        onCheckedChange={() => toggleTemplateActive(selectedTemplate)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subject (for emails) */}
                {selectedTemplate.channel === "EMAIL" && (
                  <div className="space-y-2">
                    <Label>Betreff</Label>
                    <Input
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      disabled={!editMode}
                      className={!editMode ? "bg-gray-50" : ""}
                    />
                  </div>
                )}

                {/* Variables */}
                <div className="space-y-2">
                  <Label>Verfügbare Variablen</Label>
                  <div className="flex flex-wrap gap-2">
                    {(selectedTemplate.variables || []).map((v) => (
                      <Badge key={v} variant="outline" className="font-mono text-xs">
                        {"{{" + v + "}}"}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Content Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Inhalt {selectedTemplate.channel === "EMAIL" ? "(HTML)" : "(Text)"}</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewOpen(true)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Vorschau
                      </Button>
                      {!editMode ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditMode(true)}
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Bearbeiten
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditedContent(selectedTemplate.content);
                              setEditedSubject(selectedTemplate.subject || "");
                              setEditMode(false);
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Abbrechen
                          </Button>
                          <Button
                            size="sm"
                            onClick={saveTemplate}
                            disabled={saving}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-1" />
                            )}
                            Speichern
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    disabled={!editMode}
                    className={`w-full h-[400px] font-mono text-sm p-4 border rounded-lg resize-none ${
                      !editMode ? "bg-gray-50" : "bg-white"
                    }`}
                  />
                </div>

                {/* Last updated */}
                <p className="text-sm text-gray-500">
                  Zuletzt aktualisiert: {new Date(selectedTemplate.updatedAt).toLocaleString("de-DE")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-[500px] text-gray-500">
                <Mail className="h-12 w-12 mb-4 text-gray-300" />
                <p>Wähle ein Template aus der Liste</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Template Vorschau</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name} - mit Beispieldaten
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh] border rounded-lg">
            {selectedTemplate?.channel === "EMAIL" ? (
              <iframe
                srcDoc={getPreviewHtml()}
                className="w-full h-[600px] border-0"
                title="Email Preview"
              />
            ) : (
              <div className="p-6 bg-gray-100">
                <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-lg p-4">
                  <div className="bg-green-100 rounded-lg p-3">
                    <pre className="whitespace-pre-wrap text-sm font-sans">
                      {getPreviewHtml()}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
