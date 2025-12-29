"use client";

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  Shield,
  Key,
  Save,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  CheckCircle2,
} from "lucide-react";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  whatsappNummer?: string | null;
  taskWhatsappEnabled?: boolean;
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsappNummer: "",
    taskWhatsappEnabled: false,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const { toast } = useToast();

  // 2FA State
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [disableCode, setDisableCode] = useState("");

  useEffect(() => {
    fetchProfile();
    fetch2FAStatus();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/settings/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          name: data.name || "",
          email: data.email || "",
          whatsappNummer: data.whatsappNummer || "",
          taskWhatsappEnabled: Boolean(data.taskWhatsappEnabled),
        });
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast({
        title: "Fehler",
        description: "Profil konnte nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetch2FAStatus = async () => {
    try {
      const response = await fetch("/api/settings/profile/2fa/status");
      if (response.ok) {
        const data = await response.json();
        setTwoFAEnabled(data.enabled);
      }
    } catch (error) {
      console.error("Failed to fetch 2FA status:", error);
    }
  };

  const startTwoFASetup = async () => {
    setTwoFALoading(true);
    try {
      const response = await fetch("/api/settings/profile/2fa/setup", {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
        setSetupSecret(data.secret);
        setShowSetupDialog(true);
      } else {
        const error = await response.json();
        toast({
          title: "Fehler",
          description: error.error || "2FA Setup fehlgeschlagen",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to start 2FA setup:", error);
      toast({
        title: "Fehler",
        description: "2FA Setup fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setTwoFALoading(false);
    }
  };

  const verifyAndEnable2FA = async () => {
    if (verificationCode.length !== 6) return;
    
    setTwoFALoading(true);
    try {
      const response = await fetch("/api/settings/profile/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      });
      
      if (response.ok) {
        setTwoFAEnabled(true);
        setShowSetupDialog(false);
        setVerificationCode("");
        setQrCode(null);
        setSetupSecret(null);
        toast({
          title: "Erfolg",
          description: "2FA erfolgreich aktiviert",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Fehler",
          description: error.error || "Ungültiger Code",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to verify 2FA:", error);
      toast({
        title: "Fehler",
        description: "Verifizierung fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setTwoFALoading(false);
    }
  };

  const disable2FA = async () => {
    if (disableCode.length !== 6) return;
    
    setTwoFALoading(true);
    try {
      const response = await fetch("/api/settings/profile/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      });
      
      if (response.ok) {
        setTwoFAEnabled(false);
        setShowDisableDialog(false);
        setDisableCode("");
        toast({
          title: "Erfolg",
          description: "2FA erfolgreich deaktiviert",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Fehler",
          description: error.error || "Ungültiger Code",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to disable 2FA:", error);
      toast({
        title: "Fehler",
        description: "Deaktivierung fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        toast({
          title: "Erfolg",
          description: "Profil erfolgreich gespeichert",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Fehler",
          description: error.message || "Profil konnte nicht gespeichert werden",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast({
        title: "Fehler",
        description: "Profil konnte nicht gespeichert werden",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Fehler",
        description: "Die neuen Passwörter stimmen nicht überein",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Fehler",
        description: "Passwort muss mindestens 8 Zeichen lang sein",
        variant: "destructive",
      });
      return;
    }

    try {
      setChangingPassword(true);
      const response = await fetch("/api/settings/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        toast({
          title: "Erfolg",
          description: "Passwort erfolgreich geändert",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Fehler",
          description: error.message || "Passwort konnte nicht geändert werden",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to change password:", error);
      toast({
        title: "Fehler",
        description: "Passwort konnte nicht geändert werden",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <Badge className="bg-purple-100 text-purple-800">Super-Admin</Badge>;
      case "ADMIN":
        return <Badge className="bg-blue-100 text-blue-800">Admin</Badge>;
      case "COACH":
        return <Badge className="bg-green-100 text-green-800">Coach</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profileinstellungen</h1>
        <p className="text-gray-600">Verwalte deine Kontoeinstellungen</p>
      </div>

      {/* Profilinformationen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profilinformationen
          </CardTitle>
          <CardDescription>
            Aktualisiere deine persönlichen Daten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="pl-10"
                placeholder="Dein Name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10"
                placeholder="deine@email.de"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rolle</Label>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-400" />
              {profile && getRoleBadge(profile.role)}
              <span className="text-sm text-gray-500">(Admin kontaktieren zum Ändern)</span>
            </div>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Speichere...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Änderungen speichern
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Passwort ändern */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Passwort ändern
          </CardTitle>
          <CardDescription>
            Aktualisiere dein Passwort, um dein Konto zu schützen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, currentPassword: e.target.value })
              }
              placeholder="Aktuelles Passwort eingeben"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Neues Passwort</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, newPassword: e.target.value })
              }
              placeholder="Neues Passwort eingeben (min. 8 Zeichen)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, confirmPassword: e.target.value })
              }
              placeholder="Neues Passwort bestätigen"
            />
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword}
            variant="outline"
          >
            {changingPassword ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ändere...
              </>
            ) : (
              <>
                <Key className="h-4 w-4 mr-2" />
                Passwort ändern
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            2-Faktor-Authentifizierung
          </CardTitle>
          <CardDescription>
            Schütze dein Konto mit einer zusätzlichen Sicherheitsebene
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${twoFAEnabled ? "bg-green-100" : "bg-gray-100"}`}>
                {twoFAEnabled ? (
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {twoFAEnabled ? "2FA ist aktiviert" : "2FA ist deaktiviert"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {twoFAEnabled
                    ? "Dein Konto ist durch 2FA geschützt"
                    : "Aktiviere 2FA für zusätzliche Sicherheit"}
                </p>
              </div>
            </div>
            {twoFAEnabled ? (
              <Button
                variant="outline"
                onClick={() => setShowDisableDialog(true)}
                disabled={twoFALoading}
                className="text-destructive hover:text-destructive"
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Deaktivieren
              </Button>
            ) : (
              <Button onClick={startTwoFASetup} disabled={twoFALoading}>
                {twoFALoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Smartphone className="h-4 w-4 mr-2" />
                )}
                2FA aktivieren
              </Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">So funktioniert es:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Installiere eine Authenticator-App (z.B. Google Authenticator, Authy)</li>
              <li>Scanne den QR-Code mit der App</li>
              <li>Gib den 6-stelligen Code ein, um 2FA zu aktivieren</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* 2FA Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              2FA einrichten
            </DialogTitle>
            <DialogDescription>
              Scanne den QR-Code mit deiner Authenticator-App
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {qrCode && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            )}
            
            {setupSecret && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  Oder gib diesen Code manuell ein:
                </p>
                <code className="text-sm font-mono break-all">{setupSecret}</code>
              </div>
            )}

            <div className="space-y-2">
              <Label>Verifizierungscode</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="text-center text-xl tracking-[0.5em] font-mono"
              />
            </div>

            <Button
              className="w-full"
              onClick={verifyAndEnable2FA}
              disabled={twoFALoading || verificationCode.length !== 6}
            >
              {twoFALoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Verifizieren und aktivieren
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2FA Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldOff className="h-5 w-5" />
              2FA deaktivieren
            </DialogTitle>
            <DialogDescription>
              Gib deinen aktuellen Authenticator-Code ein, um 2FA zu deaktivieren
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-lg text-sm text-destructive">
              <p className="font-medium">Warnung:</p>
              <p>
                Das Deaktivieren von 2FA verringert die Sicherheit deines Kontos.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Authenticator-Code</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={disableCode}
                onChange={(e) =>
                  setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="text-center text-xl tracking-[0.5em] font-mono"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDisableDialog(false);
                  setDisableCode("");
                }}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={disable2FA}
                disabled={twoFALoading || disableCode.length !== 6}
              >
                {twoFALoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ShieldOff className="h-4 w-4 mr-2" />
                )}
                Deaktivieren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
