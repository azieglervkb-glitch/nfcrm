import { SectionHeader } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Mail, MessageSquare, Brain, Webhook, Users } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Einstellungen" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Allgemein
            </CardTitle>
            <CardDescription>
              Grundlegende Einstellungen für das CRM
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appName">App Name</Label>
              <Input id="appName" defaultValue="NF CRM" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Firmenname</Label>
              <Input id="companyName" defaultValue="NF Mentoring" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support E-Mail</Label>
              <Input
                id="supportEmail"
                type="email"
                defaultValue="support@nf-mentoring.de"
              />
            </div>
            <Button className="mt-4">Speichern</Button>
          </CardContent>
        </Card>

        {/* KPI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" />
              KPI & AI Feedback
            </CardTitle>
            <CardDescription>
              Einstellungen für KPI-Tracking und KI-Feedback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>AI Feedback aktiviert</Label>
                <p className="text-sm text-muted-foreground">
                  Automatisches KI-Feedback nach KPI-Einreichung
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Send WhatsApp</Label>
                <p className="text-sm text-muted-foreground">
                  Feedback automatisch per WhatsApp senden
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2">
              <Label>Reminder-Zeit (Montag)</Label>
              <div className="flex gap-2">
                <Input type="time" defaultValue="05:30" className="w-32" />
                <Input type="time" defaultValue="19:00" className="w-32" />
              </div>
              <p className="text-xs text-muted-foreground">
                E-Mail und WhatsApp Erinnerungszeiten
              </p>
            </div>
            <Button className="mt-4">Speichern</Button>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              E-Mail (SMTP)
            </CardTitle>
            <CardDescription>
              SMTP-Konfiguration für E-Mail-Versand
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input id="smtpHost" placeholder="smtp.example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">Port</Label>
                <Input id="smtpPort" placeholder="587" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpUser">Benutzername</Label>
              <Input id="smtpUser" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPass">Passwort</Label>
              <Input id="smtpPass" type="password" />
            </div>
            <Button className="mt-4">Verbindung testen</Button>
          </CardContent>
        </Card>

        {/* WhatsApp Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              WhatsApp API
            </CardTitle>
            <CardDescription>
              Konfiguration für WhatsApp-Nachrichten
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappUrl">API URL</Label>
              <Input id="whatsappUrl" placeholder="https://api.example.com/send" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappKey">API Key</Label>
              <Input id="whatsappKey" type="password" />
            </div>
            <div className="space-y-2">
              <Label>Quiet Hours</Label>
              <div className="flex gap-2">
                <Input type="time" defaultValue="21:00" className="w-32" />
                <span className="self-center">bis</span>
                <Input type="time" defaultValue="08:00" className="w-32" />
              </div>
              <p className="text-xs text-muted-foreground">
                Keine WhatsApp-Nachrichten in diesem Zeitraum
              </p>
            </div>
            <Button className="mt-4">Verbindung testen</Button>
          </CardContent>
        </Card>

        {/* Copecart Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Copecart Webhook
            </CardTitle>
            <CardDescription>Webhook für automatische Mitgliederverwaltung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${process.env.NEXT_PUBLIC_APP_URL || "https://app.nf-mentoring.de"}/api/webhooks/copecart`}
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="sm">
                  Kopieren
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="copecartSecret">Webhook Secret</Label>
              <Input id="copecartSecret" type="password" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="productVpmc">VPMC ID</Label>
                <Input id="productVpmc" placeholder="Product ID" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productNfm">NFM ID</Label>
                <Input id="productNfm" placeholder="Product ID" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productPremium">Premium ID</Label>
                <Input id="productPremium" placeholder="Product ID" />
              </div>
            </div>
            <Button className="mt-4">Speichern</Button>
          </CardContent>
        </Card>

        {/* Team Link */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team-Verwaltung
            </CardTitle>
            <CardDescription>Admin- und Coach-Benutzer verwalten</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/settings/team">Team verwalten</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
