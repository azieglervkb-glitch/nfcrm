"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  UserPlus,
  Search,
  Loader2,
  Mail,
  Phone,
  MoreHorizontal,
  Trash2,
  Edit,
  UserCheck,
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

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  NEU: { label: "Neu", color: "bg-blue-100 text-blue-800" },
  KONTAKTIERT: { label: "Kontaktiert", color: "bg-yellow-100 text-yellow-800" },
  QUALIFIZIERT: { label: "Qualifiziert", color: "bg-green-100 text-green-800" },
  KONVERTIERT: { label: "Konvertiert", color: "bg-purple-100 text-purple-800" },
  VERLOREN: { label: "Verloren", color: "bg-gray-100 text-gray-800" },
};

const SOURCE_MAP: Record<string, string> = {
  ONEPAGE: "OnePage",
  WEBSITE: "Website",
  SOCIAL_MEDIA: "Social Media",
  EMPFEHLUNG: "Empfehlung",
  MANUELL: "Manuell",
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

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newLead,
          source: "MANUELL",
        }),
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

  async function updateLeadStatus(leadId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success("Status aktualisiert");
        fetchLeads();
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
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Lead gelöscht");
        fetchLeads();
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

  // Stats
  const stats = {
    total: leads.length,
    neu: leads.filter((l) => l.status === "NEU").length,
    kontaktiert: leads.filter((l) => l.status === "KONTAKTIERT").length,
    qualifiziert: leads.filter((l) => l.status === "QUALIFIZIERT").length,
  };

  return (
    <div className="space-y-6">
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
                <SelectItem value="NEU">Neu</SelectItem>
                <SelectItem value="KONTAKTIERT">Kontaktiert</SelectItem>
                <SelectItem value="QUALIFIZIERT">Qualifiziert</SelectItem>
                <SelectItem value="KONVERTIERT">Konvertiert</SelectItem>
                <SelectItem value="VERLOREN">Verloren</SelectItem>
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
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
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
                    <TableCell>
                      <Select
                        value={lead.status}
                        onValueChange={(value) => updateLeadStatus(lead.id, value)}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <Badge
                            className={`${STATUS_MAP[lead.status]?.color || ""} text-xs`}
                          >
                            {STATUS_MAP[lead.status]?.label || lead.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEU">Neu</SelectItem>
                          <SelectItem value="KONTAKTIERT">Kontaktiert</SelectItem>
                          <SelectItem value="QUALIFIZIERT">Qualifiziert</SelectItem>
                          <SelectItem value="KONVERTIERT">Konvertiert</SelectItem>
                          <SelectItem value="VERLOREN">Verloren</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell>
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Lead hinzufügen</DialogTitle>
            <DialogDescription>
              Füge einen neuen Interessenten manuell hinzu.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddLead}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vorname">Vorname *</Label>
                  <Input
                    id="vorname"
                    value={newLead.vorname}
                    onChange={(e) =>
                      setNewLead({ ...newLead, vorname: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nachname">Nachname *</Label>
                  <Input
                    id="nachname"
                    value={newLead.nachname}
                    onChange={(e) =>
                      setNewLead({ ...newLead, nachname: e.target.value })
                    }
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
                  onChange={(e) =>
                    setNewLead({ ...newLead, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefon">Telefon</Label>
                <Input
                  id="telefon"
                  value={newLead.telefon}
                  onChange={(e) =>
                    setNewLead({ ...newLead, telefon: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interessiertAn">Interessiert an</Label>
                <Select
                  value={newLead.interessiertAn}
                  onValueChange={(value) =>
                    setNewLead({ ...newLead, interessiertAn: value })
                  }
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
                  onChange={(e) =>
                    setNewLead({ ...newLead, notizen: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
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
