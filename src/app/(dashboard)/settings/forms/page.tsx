"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Eye,
  ExternalLink,
  Copy,
  Search,
  Loader2,
  User,
  Download,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { InfoTooltip } from "@/components/ui/info-tooltip";

interface Member {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  status: string;
  onboardingCompleted: boolean;
  kpiTrackingActive: boolean;
  kpiSetupCompleted?: boolean;
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

type ExportType = "onboarding" | "kpi_setup" | "kpi_weeks" | "all";

export default function FormsAndExportPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Export state
  const [exportSearchQuery, setExportSearchQuery] = useState("");
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());
  const [exportType, setExportType] = useState<ExportType>("all");
  const [includeAiFeedback, setIncludeAiFeedback] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const res = await fetch("/api/members?limit=500");
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

  const exportFilteredMembers = members.filter((m) => {
    const query = exportSearchQuery.toLowerCase();
    return (
      m.vorname.toLowerCase().includes(query) ||
      m.nachname.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query)
    );
  });

  function toggleExportSelection(memberId: string) {
    const newSelected = new Set(selectedForExport);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedForExport(newSelected);
  }

  function toggleSelectAll() {
    if (selectedForExport.size === exportFilteredMembers.length) {
      setSelectedForExport(new Set());
    } else {
      setSelectedForExport(new Set(exportFilteredMembers.map((m) => m.id)));
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: Array.from(selectedForExport),
          exportType,
          includeAiFeedback,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export fehlgeschlagen");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || "export.csv";

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Export erfolgreich: ${filename}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error instanceof Error ? error.message : "Export fehlgeschlagen");
    } finally {
      setExporting(false);
    }
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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          Formulare & Export
        </h1>
        <p className="text-muted-foreground mt-1">
          Vorschau der Formulare und Datenexport als CSV
        </p>
      </div>

      <Tabs defaultValue="forms" className="space-y-6">
        <TabsList>
          <TabsTrigger value="forms" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Formulare
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" />
            Daten-Export
          </TabsTrigger>
        </TabsList>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-6">
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
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Export-Einstellungen
              </CardTitle>
              <CardDescription>
                Wähle aus, welche Daten exportiert werden sollen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Export Type */}
                <div className="space-y-2">
                  <Label className="flex items-center">
                    Export-Typ
                    <InfoTooltip content="Wähle aus, welche Formular-Daten exportiert werden sollen" />
                  </Label>
                  <Select value={exportType} onValueChange={(v) => setExportType(v as ExportType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Alle Daten (Übersicht)
                        </span>
                      </SelectItem>
                      <SelectItem value="onboarding">
                        <span className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4" />
                          Nur Onboarding-Daten
                        </span>
                      </SelectItem>
                      <SelectItem value="kpi_setup">
                        <span className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4" />
                          Nur KPI-Setup-Daten
                        </span>
                      </SelectItem>
                      <SelectItem value="kpi_weeks">
                        <span className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Alle KPI-Wochen (detailliert)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {exportType === "all" && "Eine Zeile pro Member mit Zusammenfassung aller Daten"}
                    {exportType === "onboarding" && "Onboarding-Formular Daten (Unternehmen, Ziele, etc.)"}
                    {exportType === "kpi_setup" && "KPI-Setup Daten (Tracking-Einstellungen, Zielwerte)"}
                    {exportType === "kpi_weeks" && "Jede KPI-Woche als eigene Zeile mit allen Details"}
                  </p>
                </div>

                {/* AI Feedback Option (only for kpi_weeks) */}
                {exportType === "kpi_weeks" && (
                  <div className="space-y-2">
                    <Label>Optionen</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeAiFeedback"
                        checked={includeAiFeedback}
                        onCheckedChange={(v) => setIncludeAiFeedback(v as boolean)}
                      />
                      <Label htmlFor="includeAiFeedback" className="cursor-pointer">
                        KI-Feedback mit exportieren
                      </Label>
                    </div>
                  </div>
                )}

                {/* Date Range (only for kpi_weeks) */}
                {exportType === "kpi_weeks" && (
                  <>
                    <div className="space-y-2">
                      <Label>Von Datum</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bis Datum</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Member Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mitglieder auswählen</CardTitle>
                  <CardDescription>
                    {selectedForExport.size === 0
                      ? "Keine Auswahl = Alle Mitglieder exportieren"
                      : `${selectedForExport.size} Mitglied(er) ausgewählt`}
                  </CardDescription>
                </div>
                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  className="gap-2"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {selectedForExport.size === 0 ? "Alle exportieren" : "Auswahl exportieren"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Mitglieder suchen..."
                    value={exportSearchQuery}
                    onChange={(e) => setExportSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectedForExport.size === exportFilteredMembers.length
                    ? "Alle abwählen"
                    : "Alle auswählen"}
                </Button>
                {selectedForExport.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedForExport(new Set())}
                  >
                    Auswahl leeren
                  </Button>
                )}
              </div>

              <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="w-10 p-3">
                        <Checkbox
                          checked={selectedForExport.size === exportFilteredMembers.length && exportFilteredMembers.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="text-left p-3 text-sm font-medium">Mitglied</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-left p-3 text-sm font-medium">Onboarding</th>
                      <th className="text-left p-3 text-sm font-medium">KPI-Setup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportFilteredMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="border-t hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggleExportSelection(member.id)}
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={selectedForExport.has(member.id)}
                            onCheckedChange={() => toggleExportSelection(member.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{member.vorname} {member.nachname}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={member.status === "AKTIV" ? "default" : "secondary"} className="text-xs">
                            {member.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={member.onboardingCompleted ? "default" : "outline"} className="text-xs">
                            {member.onboardingCompleted ? "Ja" : "Nein"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={member.kpiSetupCompleted ? "default" : "outline"} className="text-xs">
                            {member.kpiSetupCompleted ? "Ja" : "Nein"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {exportFilteredMembers.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Keine Mitglieder gefunden
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Zeigt {exportFilteredMembers.length} von {members.length} Mitgliedern
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
