"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Save, RotateCcw, Loader2, CheckCircle, AlertCircle, Info, Copy, TestTube } from "lucide-react";
import { toast } from "sonner";
import { PromptTestDialog } from "@/components/settings/PromptTestDialog";

interface Prompt {
  id: string | null;
  promptKey: string;
  name: string;
  description: string | null;
  content: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function PromptsSettingsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
  const [testDialogOpen, setTestDialogOpen] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, []);

  async function fetchPrompts() {
    try {
      const res = await fetch("/api/settings/prompts");
      if (res.ok) {
        const data = await res.json();
        setPrompts(data);
      }
    } catch (error) {
      toast.error("Fehler beim Laden der Prompts");
    } finally {
      setLoading(false);
    }
  }

  async function savePrompt(prompt: Prompt) {
    setSaving(prompt.promptKey);
    try {
      const content = editedPrompts[prompt.promptKey] ?? prompt.content;
      const res = await fetch("/api/settings/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptKey: prompt.promptKey,
          name: prompt.name,
          description: prompt.description,
          content,
          isActive: prompt.isActive,
        }),
      });

      if (res.ok) {
        toast.success("Prompt gespeichert");
        // Clear edited state
        setEditedPrompts((prev) => {
          const next = { ...prev };
          delete next[prompt.promptKey];
          return next;
        });
        fetchPrompts();
      } else {
        toast.error("Fehler beim Speichern");
      }
    } catch (error) {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(null);
    }
  }

  function resetPrompt(prompt: Prompt) {
    setEditedPrompts((prev) => {
      const next = { ...prev };
      delete next[prompt.promptKey];
      return next;
    });
    toast.success("Änderungen verworfen");
  }

  function copyToClipboard(content: string) {
    navigator.clipboard.writeText(content);
    toast.success("In Zwischenablage kopiert");
  }

  function hasChanges(prompt: Prompt): boolean {
    return prompt.promptKey in editedPrompts && editedPrompts[prompt.promptKey] !== prompt.content;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            AI Prompts
          </h1>
          <p className="text-muted-foreground mt-1">
            Verwalte die KI-Prompts für automatische Feedback-Nachrichten
          </p>
        </div>
        <Button onClick={() => setTestDialogOpen(true)} variant="outline">
          <TestTube className="h-4 w-4 mr-2" />
          Prompt testen
        </Button>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Hinweis zur Prompt-Bearbeitung</p>
              <p className="mt-1">
                Diese Prompts werden verwendet, um personalisierte WhatsApp-Nachrichten
                nach KPI-Eingaben zu generieren. Änderungen wirken sich sofort auf alle
                neuen Nachrichten aus.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={prompts[0]?.promptKey || "KPI_FEEDBACK_SYSTEM"} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          {prompts.map((prompt) => (
            <TabsTrigger key={prompt.promptKey} value={prompt.promptKey} className="relative">
              {prompt.name.replace("KPI Feedback - ", "")}
              {hasChanges(prompt) && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {prompts.map((prompt) => (
          <TabsContent key={prompt.promptKey} value={prompt.promptKey}>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {prompt.name}
                      {prompt.isDefault ? (
                        <Badge variant="outline" className="text-xs">Standard</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 text-xs">Angepasst</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {prompt.description}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={prompt.isActive}
                      onCheckedChange={(checked) => {
                        setPrompts((prev) =>
                          prev.map((p) =>
                            p.promptKey === prompt.promptKey ? { ...p, isActive: checked } : p
                          )
                        );
                      }}
                    />
                    <span className="text-sm text-muted-foreground">Aktiv</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`content-${prompt.promptKey}`}>Prompt-Inhalt</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(editedPrompts[prompt.promptKey] ?? prompt.content)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Kopieren
                    </Button>
                  </div>
                  <Textarea
                    id={`content-${prompt.promptKey}`}
                    value={editedPrompts[prompt.promptKey] ?? prompt.content}
                    onChange={(e) =>
                      setEditedPrompts((prev) => ({
                        ...prev,
                        [prompt.promptKey]: e.target.value,
                      }))
                    }
                    rows={20}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {(editedPrompts[prompt.promptKey] ?? prompt.content).length} Zeichen
                  </p>
                </div>

                {prompt.promptKey === "KPI_FEEDBACK_USER" && (
                  <Card className="bg-gray-50">
                    <CardContent className="pt-4">
                      <h4 className="font-medium text-sm mb-2">Verfügbare Variablen:</h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "{{vorname}}",
                          "{{feeling_score}}",
                          "{{heldentat}}",
                          "{{blockiert}}",
                          "{{herausforderung}}",
                          "{{umsatz_soll}}",
                          "{{umsatz_ist}}",
                          "{{kontakte_soll}}",
                          "{{kontakte_ist}}",
                          "{{termine_vereinbart_soll}}",
                          "{{termine_vereinbart_ist}}",
                        ].map((variable) => (
                          <code
                            key={variable}
                            className="px-2 py-1 bg-gray-200 rounded text-xs cursor-pointer hover:bg-gray-300"
                            onClick={() => copyToClipboard(variable)}
                          >
                            {variable}
                          </code>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {prompt.updatedAt && (
                      <span>
                        Zuletzt geändert: {new Date(prompt.updatedAt).toLocaleString("de-DE")}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {hasChanges(prompt) && (
                      <Button variant="outline" onClick={() => resetPrompt(prompt)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Verwerfen
                      </Button>
                    )}
                    <Button
                      onClick={() => savePrompt(prompt)}
                      disabled={saving === prompt.promptKey}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {saving === prompt.promptKey ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Speichern...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Speichern
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tipps für effektive Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Sei spezifisch bei der Beschreibung des gewünschten Tons und Stils</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Definiere klare Regeln für den Umgang mit Grenzfällen (z.B. fehlende Daten)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Gib Beispiele für den gewünschten Output-Stil</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <span>Teste Änderungen erst mit wenigen Mitgliedern bevor du sie global aktivierst</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Test Dialog */}
      <PromptTestDialog open={testDialogOpen} onOpenChange={setTestDialogOpen} />
    </div>
  );
}
