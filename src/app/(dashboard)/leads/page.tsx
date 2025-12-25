"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  UserPlus,
  Search,
  Loader2,
  Mail,
  Phone,
  MoreHorizontal,
  Trash2,
  PhoneCall,
  MessageSquare,
  Video,
  Users,
  StickyNote,
  Calendar,
  Clock,
  ChevronRight,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Lead {
  id: string;
  email: string;
  vorname: string;
  nachname: string;
  telefon: string | null;
  whatsappNummer: string | null;
  status: string;
  source: string;
  sourceDetail: string | null;
  interessiertAn: string | null;
  notizen: string | null;
  createdAt: string;
}

interface LeadActivity {
  id: string;
  type: string;
  channel: string | null;
  subject: string | null;
  notes: string | null;
  outcome: string | null;
  nextSteps: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    vorname: string;
    nachname: string;
  } | null;
}

const STATUS_OPTIONS = [
  { value: "NEU", label: "Neu", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "KONTAKTIERT", label: "Kontaktiert", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "QUALIFIZIERT", label: "Qualifiziert", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "KONVERTIERT", label: "Konvertiert", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "VERLOREN", label: "Verloren", color: "bg-gray-100 text-gray-800 border-gray-200" },
];

const getStatusInfo = (status: string) => {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
};

const SOURCE_MAP: Record<string, string> = {
  ONEPAGE: "OnePage",
  WEBSITE: "Website",
  SOCIAL_MEDIA: "Social Media",
  EMPFEHLUNG: "Empfehlung",
  MANUELL: "Manuell",
};

const ACTIVITY_TYPE_MAP: Record<string, { label: string; icon: any; color: string }> = {
  ANRUF: { label: "Anruf", icon: PhoneCall, color: "text-blue-600 bg-blue-50" },
  EMAIL: { label: "E-Mail", icon: Mail, color: "text-purple-600 bg-purple-50" },
  WHATSAPP: { label: "WhatsApp", icon: MessageSquare, color: "text-green-600 bg-green-50" },
  MEETING: { label: "Meeting", icon: Users, color: "text-orange-600 bg-orange-50" },
  VIDEO_CALL: { label: "Video-Call", icon: Video, color: "text-indigo-600 bg-indigo-50" },
  NOTIZ: { label: "Notiz", icon: StickyNote, color: "text-gray-600 bg-gray-50" },
  STATUS_CHANGE: { label: "Status", icon: ChevronRight, color: "text-yellow-600 bg-yellow-50" },
  FOLLOW_UP: { label: "Follow-up", icon: Calendar, color: "text-red-600 bg-red-50" },
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newLead, setNewLead] = useState({
    vorname: "",
    nachname: "",
    email: "",
    telefon: "",
    interessiertAn: "",
    notizen: "",
  });

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: "",
    channel: "",
    subject: "",
    notes: "",
    outcome: "",
    nextSteps: "",
    completedAt: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  async function fetchLeads() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("limit", "100");
      const res = await fetch(`/api/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      toast.error("Fehler beim Laden der Leads");
    } finally {
      setLoading(false);
    }
  }

  async function fetchActivities(leadId: string) {
    setLoadingActivities(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/activities`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      toast.error("Fehler beim Laden der Aktivitäten");
    } finally {
      setLoadingActivities(false);
    }
  }

  function openLeadDetail(lead: Lead) {
    setSelectedLead(lead);
    fetchActivities(lead.id);
  }

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newLead, source: "MANUELL" }),
      });
      if (res.ok) {
        toast.success("Lead erfolgreich erstellt");
        setShowAddDialog(false);
        setNewLead({
          vorname: "",
          nachname: "",
          email: "",
          telefon: "",
          interessiertAn: "",
          notizen: "",
        });
        fetchLeads();
      } else {
        const data = await res.json();
        toast.error(data.error || "Fehler beim Erstellen");
      }
    } catch (error) {
      toast.error("Fehler beim Erstellen des Leads");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLead || !newActivity.type) return;
    setSavingActivity(true);
    try {
      const res = await fetch(`/api/leads/${selectedLead.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newActivity,
          channel: newActivity.channel || null,
        }),
      });
      if (res.ok) {
        toast.success("Aktivität hinzugefügt");
        setShowActivityDialog(false);
        setNewActivity({
          type: "",
          channel: "",
          subject: "",
          notes: "",
          outcome: "",
          nextSteps: "",
          completedAt: new Date().toISOString().slice(0, 16),
        });
        fetchActivities(selectedLead.id);
        fetchLeads();
      } else {
        toast.error("Fehler beim Hinzufügen");
      }
    } catch (error) {
      toast.error("Fehler beim Hinzufügen der Aktivität");
    } finally {
      setSavingActivity(false);
    }
  }

  async function updateLeadStatus(leadId: string, newStatus: string) {
    const oldLead = leads.find((l) => l.id === leadId);
    if (!oldLead || oldLead.status === newStatus) return;

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success("Status aktualisiert");
        fetchLeads();
        if (selectedLead?.id === leadId) {
          setSelectedLead({ ...selectedLead, status: newStatus });
        }
        // Log status change activity
        await fetch(`/api/leads/${leadId}/activities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "STATUS_CHANGE",
            subject: `Status geändert: ${getStatusInfo(oldLead.status).label} → ${getStatusInfo(newStatus).label}`,
          }),
        });
        if (selectedLead?.id === leadId) {
          fetchActivities(leadId);
        }
      } else {
        toast.error("Fehler beim Aktualisieren");
      }
    } catch (error) {
      toast.error("Fehler beim Aktualisieren");
    }
  }

  async function deleteLead(leadId: string) {
    if (!confirm("Lead wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Lead gelöscht");
        fetchLeads();
        if (selectedLead?.id === leadId) setSelectedLead(null);
      } else {
        toast.error("Fehler beim Löschen");
      }
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  }

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.vorname.toLowerCase().includes(query) ||
      lead.nachname.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: leads.length,
    neu: leads.filter((l) => l.status === "NEU").length,
    kontaktiert: leads.filter((l) => l.status === "KONTAKTIERT").length,
    qualifiziert: leads.filter((l) => l.status === "QUALIFIZIERT").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">
            Verwalte Interessenten die noch nicht gekauft haben
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Lead hinzufügen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.neu}</div>
            <p className="text-sm text-muted-foreground">Neue Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.kontaktiert}</div>
            <p className="text-sm text-muted-foreground">Kontaktiert</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.qualifiziert}</div>
            <p className="text-sm text-muted-foreground">Qualifiziert</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Lead suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Leads gefunden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Quelle</TableHead>
                  <TableHead>Interessiert an</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const statusInfo = getStatusInfo(lead.status);
                  return (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openLeadDetail(lead)}
                    >
                      <TableCell className="font-medium">
                        {lead.vorname} {lead.nachname}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {lead.email}
                          </div>
                          {lead.telefon && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {lead.telefon}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {SOURCE_MAP[lead.source] || lead.source}
                        </span>
                        {lead.sourceDetail && (
                          <p className="text-xs text-muted-foreground">
                            {lead.sourceDetail}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.interessiertAn && (
                          <Badge variant="outline">{lead.interessiertAn}</Badge>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={lead.status}
                          onValueChange={(value) => updateLeadStatus(lead.id, value)}
                        >
                          <SelectTrigger className={`w-[140px] h-8 border ${statusInfo.color}`}>
                            <SelectValue>{statusInfo.label}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-2 h-2 rounded-full ${status.color.split(" ")[0]}`}
                                  />
                                  {status.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString("de-DE")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => deleteLead(lead.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Sheet */}
      <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedLead && (
            <div className="h-full flex flex-col">
              <SheetHeader className="space-y-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <SheetTitle className="text-xl">
                      {selectedLead.vorname} {selectedLead.nachname}
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Lead seit {new Date(selectedLead.createdAt).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                  <Badge className={`${getStatusInfo(selectedLead.status).color} shrink-0`}>
                    {getStatusInfo(selectedLead.status).label}
                  </Badge>
                </div>
              </SheetHeader>

              <Separator />

              <div className="flex-1 py-6 space-y-6">
                {/* Contact Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Kontaktdaten
                  </h3>
                  <div className="space-y-2">
                    <a
                      href={`mailto:${selectedLead.email}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedLead.email}</span>
                    </a>
                    {selectedLead.telefon && (
                      <a
                        href={`tel:${selectedLead.telefon}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedLead.telefon}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Status Change */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Status ändern
                  </h3>
                  <Select
                    value={selectedLead.status}
                    onValueChange={(value) => updateLeadStatus(selectedLead.id, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${status.color.split(" ")[0]}`}
                            />
                            {status.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                {selectedLead.notizen && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Notizen
                    </h3>
                    <p className="text-sm bg-muted p-3 rounded-lg">{selectedLead.notizen}</p>
                  </div>
                )}

                {/* Activity History */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Kontakt-Historie
                    </h3>
                    <Button size="sm" onClick={() => setShowActivityDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Aktivität
                    </Button>
                  </div>

                  {loadingActivities ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Noch keine Aktivitäten</p>
                      <p className="text-xs mt-1">
                        Klicke auf &quot;Aktivität&quot; um den ersten Kontakt zu dokumentieren
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activities.map((activity) => {
                        const typeInfo = ACTIVITY_TYPE_MAP[activity.type] || {
                          label: activity.type,
                          icon: StickyNote,
                          color: "text-gray-600 bg-gray-50",
                        };
                        const Icon = typeInfo.icon;
                        return (
                          <div key={activity.id} className="flex gap-3">
                            <div
                              className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${typeInfo.color}`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{typeInfo.label}</span>
                                {activity.channel && (
                                  <Badge variant="outline" className="text-xs">
                                    {activity.channel === "INBOUND" ? (
                                      <>
                                        <ArrowDownLeft className="h-3 w-3 mr-1" />
                                        Eingehend
                                      </>
                                    ) : (
                                      <>
                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                        Ausgehend
                                      </>
                                    )}
                                  </Badge>
                                )}
                              </div>
                              {activity.subject && (
                                <p className="text-sm font-medium">{activity.subject}</p>
                              )}
                              {activity.notes && (
                                <p className="text-sm text-muted-foreground">{activity.notes}</p>
                              )}
                              {activity.outcome && (
                                <p className="text-sm">
                                  <span className="font-medium">Ergebnis:</span> {activity.outcome}
                                </p>
                              )}
                              {activity.nextSteps && (
                                <p className="text-sm">
                                  <span className="font-medium">Nächste Schritte:</span>{" "}
                                  {activity.nextSteps}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground pt-1">
                                {new Date(
                                  activity.completedAt || activity.createdAt
                                ).toLocaleString("de-DE")}
                                {activity.createdBy &&
                                  ` · ${activity.createdBy.vorname} ${activity.createdBy.nachname}`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Activity Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Aktivität hinzufügen</DialogTitle>
            <DialogDescription>
              Dokumentiere einen Kontakt mit {selectedLead?.vorname} {selectedLead?.nachname}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddActivity}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Typ *</Label>
                  <Select
                    value={newActivity.type}
                    onValueChange={(value) => setNewActivity({ ...newActivity, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANRUF">Anruf</SelectItem>
                      <SelectItem value="EMAIL">E-Mail</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                      <SelectItem value="MEETING">Meeting</SelectItem>
                      <SelectItem value="VIDEO_CALL">Video-Call</SelectItem>
                      <SelectItem value="NOTIZ">Notiz</SelectItem>
                      <SelectItem value="FOLLOW_UP">Follow-up geplant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Richtung</Label>
                  <Select
                    value={newActivity.channel}
                    onValueChange={(value) => setNewActivity({ ...newActivity, channel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OUTBOUND">Ausgehend (wir haben kontaktiert)</SelectItem>
                      <SelectItem value="INBOUND">Eingehend (Lead hat sich gemeldet)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Betreff / Zusammenfassung</Label>
                <Input
                  value={newActivity.subject}
                  onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })}
                  placeholder="z.B. Erstgespräch geführt"
                />
              </div>
              <div className="space-y-2">
                <Label>Datum & Uhrzeit</Label>
                <Input
                  type="datetime-local"
                  value={newActivity.completedAt}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, completedAt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Notizen</Label>
                <Textarea
                  value={newActivity.notes}
                  onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                  placeholder="Details zum Gespräch..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Ergebnis</Label>
                <Input
                  value={newActivity.outcome}
                  onChange={(e) => setNewActivity({ ...newActivity, outcome: e.target.value })}
                  placeholder="z.B. Interesse bestätigt, will Angebot"
                />
              </div>
              <div className="space-y-2">
                <Label>Nächste Schritte</Label>
                <Input
                  value={newActivity.nextSteps}
                  onChange={(e) => setNewActivity({ ...newActivity, nextSteps: e.target.value })}
                  placeholder="z.B. Angebot senden bis Freitag"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowActivityDialog(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={savingActivity || !newActivity.type}>
                {savingActivity ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  "Aktivität speichern"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Neuen Lead hinzufügen</DialogTitle>
            <DialogDescription>Füge einen neuen Interessenten manuell hinzu.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddLead}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vorname">Vorname *</Label>
                  <Input
                    id="vorname"
                    value={newLead.vorname}
                    onChange={(e) => setNewLead({ ...newLead, vorname: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nachname">Nachname *</Label>
                  <Input
                    id="nachname"
                    value={newLead.nachname}
                    onChange={(e) => setNewLead({ ...newLead, nachname: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefon">Telefon</Label>
                <Input
                  id="telefon"
                  value={newLead.telefon}
                  onChange={(e) => setNewLead({ ...newLead, telefon: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interessiertAn">Interessiert an</Label>
                <Select
                  value={newLead.interessiertAn}
                  onValueChange={(value) => setNewLead({ ...newLead, interessiertAn: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Produkt auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VPMC">VPMC</SelectItem>
                    <SelectItem value="NFM">NF Mentoring</SelectItem>
                    <SelectItem value="PREMIUM">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notizen">Notizen</Label>
                <Textarea
                  id="notizen"
                  value={newLead.notizen}
                  onChange={(e) => setNewLead({ ...newLead, notizen: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  "Lead erstellen"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
