"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Eye, ExternalLink, Copy, Search, Loader2, User } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  status: string;
  onboardingCompleted: boolean;
  kpiTrackingActive: boolean;
}

interface FormType {
  id: string;
  name: string;
  description: string;
  urlPattern: string;
  completedField: keyof Member | null;
}

const FORM_TYPES: FormType[] = [
  {
    id: "onboarding",
    name: "Onboarding-Formular",
    description: "Wird neuen Mitgliedern nach der Anmeldung gesendet",
    urlPattern: "/form/onboarding/",
    completedField: "onboardingCompleted",
  },
  {
    id: "kpi-setup",
    name: "KPI-Setup Formular",
    description: "Zur Einrichtung des persönlichen KPI-Trackings",
    urlPattern: "/form/kpi-setup/",
    completedField: "kpiTrackingActive",
  },
  {
    id: "weekly",
    name: "Wöchentliches KPI-Formular",
    description: "Wöchentliche Eingabe der KPI-Werte",
    urlPattern: "/form/weekly/",
    completedField: null,
  },
];

export default function FormsSettingsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const res = await fetch("/api/members?limit=100");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      toast.error("Fehler beim Laden der Mitglieder");
    } finally {
      setLoading(false);
    }
  }

  function getFormUrl(member: Member, formType: FormType): string {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}${formType.urlPattern}${member.id}`;
  }

  function copyToClipboard(url: string) {
    navigator.clipboard.writeText(url);
    toast.success("Link in Zwischenablage kopiert");
  }

  function openPreview(url: string) {
    setPreviewUrl(url);
  }

  const filteredMembers = members.filter((m) => {
    const query = searchQuery.toLowerCase();
    return (
      m.vorname.toLowerCase().includes(query) ||
      m.nachname.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          Formulare
        </h1>
        <p className="text-muted-foreground mt-1">
          Vorschau und Verwaltung der Mitglieder-Formulare
        </p>
      </div>

      {/* Form Types Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        {FORM_TYPES.map((formType) => (
          <Card key={formType.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{formType.name}</CardTitle>
              <CardDescription className="text-xs">{formType.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">
                URL-Muster: <code className="bg-muted px-1 rounded">{formType.urlPattern}[member-id]</code>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Member Search */}
      <Card>
        <CardHeader>
          <CardTitle>Formular-Links für Mitglieder</CardTitle>
          <CardDescription>
            Suche ein Mitglied, um dessen Formular-Links anzuzeigen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Mitglied suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {searchQuery && (
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {filteredMembers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Keine Mitglieder gefunden
                </p>
              ) : (
                filteredMembers.slice(0, 10).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedMember(member)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{member.vorname} {member.nachname}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={member.status === "AKTIV" ? "default" : "secondary"}>
                        {member.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Member Forms */}
      {selectedMember && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Formulare für {selectedMember.vorname} {selectedMember.nachname}
                </CardTitle>
                <CardDescription>{selectedMember.email}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)}>
                Schließen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {FORM_TYPES.map((formType) => {
                const url = getFormUrl(selectedMember, formType);
                const isCompleted = formType.completedField
                  ? selectedMember[formType.completedField]
                  : null;

                return (
                  <div key={formType.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{formType.name}</h4>
                        <p className="text-sm text-muted-foreground">{formType.description}</p>
                      </div>
                      {formType.completedField && (
                        <Badge variant={isCompleted ? "default" : "secondary"}>
                          {isCompleted ? "Abgeschlossen" : "Ausstehend"}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Input value={url} readOnly className="flex-1 text-sm font-mono" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(url)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => openPreview(url)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => window.open(url, "_blank")}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Formular-Vorschau</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded-lg border bg-white">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full min-h-[500px]"
                title="Form Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
