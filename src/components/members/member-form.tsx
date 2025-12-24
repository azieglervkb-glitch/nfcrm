"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Coach {
  id: string;
  vorname: string;
  nachname: string;
}

interface MemberFormProps {
  memberId?: string;
  initialData?: any;
}

const PRODUKTE = ["NFM", "PREMIUM", "VPMC", "ELITE"];
const STATUSES = ["AKTIV", "PAUSIERT", "GEKUENDIGT", "INAKTIV"];

export function MemberForm({ memberId, initialData }: MemberFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [formData, setFormData] = useState({
    email: initialData?.email || "",
    vorname: initialData?.vorname || "",
    nachname: initialData?.nachname || "",
    telefon: initialData?.telefon || "",
    whatsappNummer: initialData?.whatsappNummer || "",
    unternehmen: initialData?.unternehmen || "",
    position: initialData?.position || "",
    produkte: initialData?.produkte || [],
    status: initialData?.status || "AKTIV",
    assignedCoachId: initialData?.assignedCoachId || "",
    notizen: initialData?.notizen || "",
    // Goals
    hauptzielEinSatz: initialData?.hauptzielEinSatz || "",
    zielMonatsumsatz: initialData?.zielMonatsumsatz || "",
    aktuellerMonatsumsatz: initialData?.aktuellerMonatsumsatz || "",
    // KPI Settings
    kpiTrackingActive: initialData?.kpiTrackingActive || false,
    trackKontakte: initialData?.trackKontakte ?? true,
    trackTermine: initialData?.trackTermine ?? true,
    trackEinheiten: initialData?.trackEinheiten ?? false,
    trackEmpfehlungen: initialData?.trackEmpfehlungen ?? true,
    trackEntscheider: initialData?.trackEntscheider ?? false,
    trackAbschluesse: initialData?.trackAbschluesse ?? true,
    // Soll-Werte
    umsatzSollWoche: initialData?.umsatzSollWoche || "",
    umsatzSollMonat: initialData?.umsatzSollMonat || "",
    kontakteSoll: initialData?.kontakteSoll || "",
    termineVereinbartSoll: initialData?.termineVereinbartSoll || "",
    termineAbschlussSoll: initialData?.termineAbschlussSoll || "",
    einheitenSoll: initialData?.einheitenSoll || "",
    empfehlungenSoll: initialData?.empfehlungenSoll || "",
    // Flags
    churnRisk: initialData?.churnRisk || false,
    upsellCandidate: initialData?.upsellCandidate || false,
  });

  useEffect(() => {
    fetchCoaches();
  }, []);

  async function fetchCoaches() {
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setCoaches(data.filter((u: any) => u.role === "COACH" || u.role === "ADMIN"));
      }
    } catch (error) {
      console.error("Failed to fetch coaches:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        zielMonatsumsatz: formData.zielMonatsumsatz ? Number(formData.zielMonatsumsatz) : null,
        aktuellerMonatsumsatz: formData.aktuellerMonatsumsatz ? Number(formData.aktuellerMonatsumsatz) : null,
        umsatzSollWoche: formData.umsatzSollWoche ? Number(formData.umsatzSollWoche) : null,
        umsatzSollMonat: formData.umsatzSollMonat ? Number(formData.umsatzSollMonat) : null,
        kontakteSoll: formData.kontakteSoll ? Number(formData.kontakteSoll) : null,
        termineVereinbartSoll: formData.termineVereinbartSoll ? Number(formData.termineVereinbartSoll) : null,
        termineAbschlussSoll: formData.termineAbschlussSoll ? Number(formData.termineAbschlussSoll) : null,
        einheitenSoll: formData.einheitenSoll ? Number(formData.einheitenSoll) : null,
        empfehlungenSoll: formData.empfehlungenSoll ? Number(formData.empfehlungenSoll) : null,
        assignedCoachId: formData.assignedCoachId || null,
      };

      const url = memberId ? `/api/members/${memberId}` : "/api/members";
      const method = memberId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(memberId ? "Mitglied aktualisiert" : "Mitglied erstellt");
        router.push(`/members/${data.id}`);
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

  function toggleProdukt(produkt: string) {
    setFormData((prev) => ({
      ...prev,
      produkte: prev.produkte.includes(produkt)
        ? prev.produkte.filter((p: string) => p !== produkt)
        : [...prev.produkte, produkt],
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={memberId ? `/members/${memberId}` : "/members"}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {memberId ? "Mitglied bearbeiten" : "Neues Mitglied"}
        </h1>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Grunddaten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vorname">Vorname *</Label>
              <Input
                id="vorname"
                value={formData.vorname}
                onChange={(e) => setFormData({ ...formData, vorname: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nachname">Nachname *</Label>
              <Input
                id="nachname"
                value={formData.nachname}
                onChange={(e) => setFormData({ ...formData, nachname: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefon">Telefon</Label>
              <Input
                id="telefon"
                value={formData.telefon}
                onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappNummer">WhatsApp-Nummer</Label>
              <Input
                id="whatsappNummer"
                value={formData.whatsappNummer}
                onChange={(e) => setFormData({ ...formData, whatsappNummer: e.target.value })}
                placeholder="+491234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unternehmen">Unternehmen</Label>
              <Input
                id="unternehmen"
                value={formData.unternehmen}
                onChange={(e) => setFormData({ ...formData, unternehmen: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Produkte</Label>
            <div className="flex flex-wrap gap-4">
              {PRODUKTE.map((p) => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.produkte.includes(p)}
                    onCheckedChange={() => toggleProdukt(p)}
                  />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Coach zuweisen</Label>
            <Select
              value={formData.assignedCoachId}
              onValueChange={(value) => setFormData({ ...formData, assignedCoachId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Keinen Coach zugewiesen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Keinen Coach</SelectItem>
                {coaches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.vorname} {c.nachname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Ziele & Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hauptzielEinSatz">Hauptziel (ein Satz)</Label>
            <Input
              id="hauptzielEinSatz"
              value={formData.hauptzielEinSatz}
              onChange={(e) => setFormData({ ...formData, hauptzielEinSatz: e.target.value })}
              placeholder="z.B. 50.000€ Monatsumsatz bis Ende 2024"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aktuellerMonatsumsatz">Aktueller Monatsumsatz (€)</Label>
              <Input
                id="aktuellerMonatsumsatz"
                type="number"
                value={formData.aktuellerMonatsumsatz}
                onChange={(e) => setFormData({ ...formData, aktuellerMonatsumsatz: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zielMonatsumsatz">Ziel-Monatsumsatz (€)</Label>
              <Input
                id="zielMonatsumsatz"
                type="number"
                value={formData.zielMonatsumsatz}
                onChange={(e) => setFormData({ ...formData, zielMonatsumsatz: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={formData.churnRisk}
                onCheckedChange={(checked) => setFormData({ ...formData, churnRisk: checked })}
              />
              <span>Churn Risk</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={formData.upsellCandidate}
                onCheckedChange={(checked) => setFormData({ ...formData, upsellCandidate: checked })}
              />
              <span>Upsell Kandidat</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* KPI Settings */}
      <Card>
        <CardHeader>
          <CardTitle>KPI-Tracking Einstellungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.kpiTrackingActive}
              onCheckedChange={(checked) => setFormData({ ...formData, kpiTrackingActive: checked })}
            />
            <Label>KPI-Tracking aktiv</Label>
          </div>

          {formData.kpiTrackingActive && (
            <>
              <div className="space-y-2">
                <Label>Zu trackende KPIs</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.trackKontakte}
                      onCheckedChange={(checked) => setFormData({ ...formData, trackKontakte: !!checked })}
                    />
                    <span>Kontakte</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.trackTermine}
                      onCheckedChange={(checked) => setFormData({ ...formData, trackTermine: !!checked })}
                    />
                    <span>Termine</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.trackEinheiten}
                      onCheckedChange={(checked) => setFormData({ ...formData, trackEinheiten: !!checked })}
                    />
                    <span>Einheiten</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.trackEmpfehlungen}
                      onCheckedChange={(checked) => setFormData({ ...formData, trackEmpfehlungen: !!checked })}
                    />
                    <span>Empfehlungen</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.trackEntscheider}
                      onCheckedChange={(checked) => setFormData({ ...formData, trackEntscheider: !!checked })}
                    />
                    <span>Entscheider</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.trackAbschluesse}
                      onCheckedChange={(checked) => setFormData({ ...formData, trackAbschluesse: !!checked })}
                    />
                    <span>Abschlüsse</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Umsatz-Soll/Woche (€)</Label>
                  <Input
                    type="number"
                    value={formData.umsatzSollWoche}
                    onChange={(e) => setFormData({ ...formData, umsatzSollWoche: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kontakte-Soll</Label>
                  <Input
                    type="number"
                    value={formData.kontakteSoll}
                    onChange={(e) => setFormData({ ...formData, kontakteSoll: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Termine-Soll</Label>
                  <Input
                    type="number"
                    value={formData.termineVereinbartSoll}
                    onChange={(e) => setFormData({ ...formData, termineVereinbartSoll: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Empfehlungen-Soll</Label>
                  <Input
                    type="number"
                    value={formData.empfehlungenSoll}
                    onChange={(e) => setFormData({ ...formData, empfehlungenSoll: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notizen</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notizen}
            onChange={(e) => setFormData({ ...formData, notizen: e.target.value })}
            rows={4}
            placeholder="Interne Notizen zum Mitglied..."
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Link href={memberId ? `/members/${memberId}` : "/members"}>
          <Button variant="outline" type="button">Abbrechen</Button>
        </Link>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {memberId ? "Speichern" : "Mitglied erstellen"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
