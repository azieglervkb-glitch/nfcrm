"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  UserCog,
  User,
  Save,
  Loader2,
  Mail
} from "lucide-react";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  email: string;
  vorname: string;
  nachname: string;
  role: "SUPER_ADMIN" | "ADMIN" | "COACH";
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  _count?: { assignedMembers: number };
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    vorname: "",
    nachname: "",
    password: "",
    role: "COACH" as "SUPER_ADMIN" | "ADMIN" | "COACH",
    isActive: true,
  });

  useEffect(() => {
    fetchTeam();
  }, []);

  async function fetchTeam() {
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setTeam(data);
      }
    } catch (error) {
      console.error("Failed to fetch team:", error);
    } finally {
      setLoading(false);
    }
  }

  function openEditDialog(member: TeamMember) {
    setEditingMember(member);
    setFormData({
      email: member.email,
      vorname: member.vorname,
      nachname: member.nachname,
      password: "",
      role: member.role,
      isActive: member.isActive,
    });
    setIsDialogOpen(true);
  }

  function openNewDialog() {
    setEditingMember(null);
    setFormData({
      email: "",
      vorname: "",
      nachname: "",
      password: "",
      role: "COACH",
      isActive: true,
    });
    setIsDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: any = { ...formData };
      if (!payload.password) {
        delete payload.password;
      }

      const url = editingMember
        ? `/api/team/${editingMember.id}`
        : "/api/team";
      const method = editingMember ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          editingMember ? "Teammitglied aktualisiert" : "Teammitglied erstellt"
        );
        setIsDialogOpen(false);
        fetchTeam();
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
    if (!confirm("Sicher, dass du dieses Teammitglied löschen möchtest?")) return;

    try {
      const res = await fetch(`/api/team/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Teammitglied gelöscht");
        fetchTeam();
      } else {
        const error = await res.json();
        toast.error(error.error || "Fehler beim Löschen");
      }
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  }

  function getRoleIcon(role: string) {
    switch (role) {
      case "SUPER_ADMIN":
        return <Shield className="h-4 w-4" />;
      case "ADMIN":
        return <UserCog className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  }

  function getRoleLabel(role: string) {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super-Admin";
      case "ADMIN":
        return "Admin";
      case "COACH":
        return "Coach";
      default:
        return role;
    }
  }

  function getRoleBadgeVariant(role: string) {
    switch (role) {
      case "SUPER_ADMIN":
        return "destructive" as const;
      case "ADMIN":
        return "default" as const;
      default:
        return "secondary" as const;
    }
  }

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
          <h1 className="text-2xl font-bold">Team-Verwaltung</h1>
          <p className="text-muted-foreground">
            Verwalte Admins und Coaches
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Teammitglied hinzufügen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {team.filter((m) => m.role === "SUPER_ADMIN").length}
                </div>
                <p className="text-sm text-muted-foreground">Super-Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <UserCog className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {team.filter((m) => m.role === "ADMIN").length}
                </div>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <User className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {team.filter((m) => m.role === "COACH").length}
                </div>
                <p className="text-sm text-muted-foreground">Coaches</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team List */}
      <Card>
        <CardHeader>
          <CardTitle>Teammitglieder ({team.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {team.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Kein Team</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Füge dein erstes Teammitglied hinzu.
              </p>
              <Button onClick={openNewDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Teammitglied hinzufügen
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {team.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border bg-card ${
                    !member.isActive ? "opacity-60" : ""
                  }`}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {member.vorname.charAt(0)}
                      {member.nachname.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {member.vorname} {member.nachname}
                      </span>
                      <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                        {getRoleIcon(member.role)}
                        {getRoleLabel(member.role)}
                      </Badge>
                      {!member.isActive && (
                        <Badge variant="outline">Inaktiv</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </span>
                      {member._count && (
                        <span>{member._count.assignedMembers} Mitglieder</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(member)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(member.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMember ? "Teammitglied bearbeiten" : "Neues Teammitglied"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vorname">Vorname</Label>
                <Input
                  id="vorname"
                  value={formData.vorname}
                  onChange={(e) =>
                    setFormData({ ...formData, vorname: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nachname">Nachname</Label>
                <Input
                  id="nachname"
                  value={formData.nachname}
                  onChange={(e) =>
                    setFormData({ ...formData, nachname: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Passwort {editingMember && "(leer lassen um beizubehalten)"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder={editingMember ? "••••••••" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label>Rolle</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "SUPER_ADMIN" | "ADMIN" | "COACH") =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COACH">Coach</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super-Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Account aktiv</Label>
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
