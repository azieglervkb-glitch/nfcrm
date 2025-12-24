"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Mail,
  Copy,
  Save,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  slug: string;
  name: string;
  channel: "WHATSAPP" | "EMAIL" | "SMS";
  subject: string | null;
  content: string;
  variables: string[];
  isActive: boolean;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    channel: "WHATSAPP" as "WHATSAPP" | "EMAIL" | "SMS",
    subject: "",
    content: "",
    variables: "",
    isActive: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  }

  function openEditDialog(template: Template) {
    setEditingTemplate(template);
    setFormData({
      slug: template.slug,
      name: template.name,
      channel: template.channel,
      subject: template.subject || "",
      content: template.content,
      variables: template.variables.join(", "),
      isActive: template.isActive,
    });
    setIsDialogOpen(true);
  }

  function openNewDialog() {
    setEditingTemplate(null);
    setFormData({
      slug: "",
      name: "",
      channel: "WHATSAPP",
      subject: "",
      content: "",
      variables: "",
      isActive: true,
    });
    setIsDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        variables: formData.variables.split(",").map((v) => v.trim()).filter(Boolean),
      };

      const url = editingTemplate
        ? `/api/templates/${editingTemplate.id}`
        : "/api/templates";
      const method = editingTemplate ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          editingTemplate ? "Template aktualisiert" : "Template erstellt"
        );
        setIsDialogOpen(false);
        fetchTemplates();
      } else {
        const error = await res.json();
        toast.error(error.error || "Fehler beim Speichern");
      }
    } catch (error) {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Sicher, dass du dieses Template löschen möchtest?")) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Template gelöscht");
        fetchTemplates();
      }
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  }

  function copyVariable(variable: string) {
    navigator.clipboard.writeText(`{{${variable}}}`);
    toast.success(`{{${variable}}} kopiert`);
  }

  const availableVariables = [
    "vorname",
    "nachname",
    "email",
    "weekNumber",
    "link",
    "umsatz",
    "feedback",
    "coachName",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Message Templates</h1>
          <p className="text-muted-foreground">
            Vorlagen für automatische Nachrichten
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Neues Template
        </Button>
      </div>

      {/* Variables Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Verfügbare Variablen</CardTitle>
          <CardDescription>
            Klicken zum Kopieren. Verwende diese in deinen Templates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableVariables.map((v) => (
              <Badge
                key={v}
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => copyVariable(v)}
              >
                <Copy className="mr-1 h-3 w-3" />
                {`{{${v}}}`}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">Keine Templates</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Erstelle dein erstes Message Template.
                </p>
                <Button onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Template erstellen
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card
              key={template.id}
              className={!template.isActive ? "opacity-60" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {template.channel === "WHATSAPP" ? (
                      <MessageSquare className="h-5 w-5 text-green-600" />
                    ) : (
                      <Mail className="h-5 w-5 text-blue-600" />
                    )}
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">
                        {template.slug}
                      </p>
                    </div>
                  </div>
                  <Badge variant={template.isActive ? "default" : "secondary"}>
                    {template.isActive ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {template.subject && (
                  <p className="text-sm font-medium mb-2">
                    Betreff: {template.subject}
                  </p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {template.content}
                </p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.variables.map((v) => (
                    <Badge key={v} variant="outline" className="text-xs">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(template)}
                    className="flex-1"
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Bearbeiten
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Template bearbeiten" : "Neues Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (eindeutig)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="kpi_reminder"
                  disabled={!!editingTemplate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="KPI Erinnerung"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kanal</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value: "WHATSAPP" | "EMAIL" | "SMS") =>
                    setFormData({ ...formData, channel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">E-Mail</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="variables">Variablen (kommagetrennt)</Label>
                <Input
                  id="variables"
                  value={formData.variables}
                  onChange={(e) =>
                    setFormData({ ...formData, variables: e.target.value })
                  }
                  placeholder="vorname, link, weekNumber"
                />
              </div>
            </div>

            {formData.channel === "EMAIL" && (
              <div className="space-y-2">
                <Label htmlFor="subject">Betreff</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="Erinnerung: Deine KPIs für KW{{weekNumber}}"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="content">Nachricht</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Hey {{vorname}}! Vergiss nicht deine KPIs einzutragen..."
                rows={6}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Template aktiv</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Speichern
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
