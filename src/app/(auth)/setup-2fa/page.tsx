"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
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
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  Smartphone,
  Loader2,
  CheckCircle2,
  LogOut,
  AlertTriangle,
} from "lucide-react";

export default function Setup2FAPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    checkStatusAndStartSetup();
  }, []);

  const checkStatusAndStartSetup = async () => {
    try {
      // First check current 2FA status
      const statusResponse = await fetch("/api/settings/profile/2fa/status");
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.enabled) {
          // Already has 2FA, redirect to dashboard
          router.push("/dashboard");
          return;
        }
        setUserName(statusData.userName || "");
      }

      // Start 2FA setup automatically
      await startSetup();
    } catch (error) {
      console.error("Failed to check 2FA status:", error);
      toast({
        title: "Fehler",
        description: "Status konnte nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startSetup = async () => {
    setSetupLoading(true);
    try {
      const response = await fetch("/api/settings/profile/2fa/setup", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
        setSetupSecret(data.secret);
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
      setSetupLoading(false);
    }
  };

  const verifyAndEnable2FA = async () => {
    if (verificationCode.length !== 6) return;

    setVerifying(true);
    try {
      const response = await fetch("/api/settings/profile/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (response.ok) {
        toast({
          title: "Erfolg!",
          description: "2FA erfolgreich aktiviert. Du wirst weitergeleitet...",
        });

        // Force session refresh and redirect
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        const error = await response.json();
        toast({
          title: "Fehler",
          description: error.error || "Ungültiger Code. Bitte versuche es erneut.",
          variant: "destructive",
        });
        setVerificationCode("");
      }
    } catch (error) {
      console.error("Failed to verify 2FA:", error);
      toast({
        title: "Fehler",
        description: "Verifizierung fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Lade 2FA-Einrichtung...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/nf-logo.png" alt="NF Mentoring" className="h-16 w-auto" />
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">2FA einrichten</CardTitle>
            <CardDescription>
              {userName && `Hallo ${userName}! `}
              Die Zwei-Faktor-Authentifizierung ist Pflicht, um dein Konto zu schützen.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Warning Banner */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Pflichteinrichtung</p>
                <p className="text-amber-700">
                  Du musst 2FA aktivieren, bevor du das CRM nutzen kannst.
                </p>
              </div>
            </div>

            {/* Step 1: Install App */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs">1</span>
                Authenticator-App installieren
              </div>
              <p className="text-sm text-muted-foreground ml-8">
                Installiere eine App wie <strong>Google Authenticator</strong>, <strong>Authy</strong> oder <strong>Microsoft Authenticator</strong> auf deinem Smartphone.
              </p>
            </div>

            {/* Step 2: Scan QR Code */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs">2</span>
                QR-Code scannen
              </div>

              {setupLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : qrCode ? (
                <div className="ml-8 space-y-3">
                  <div className="flex justify-center p-4 bg-white rounded-lg border">
                    <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" />
                  </div>

                  {setupSecret && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">
                        Oder gib diesen Code manuell ein:
                      </p>
                      <code className="text-xs font-mono break-all select-all">{setupSecret}</code>
                    </div>
                  )}
                </div>
              ) : (
                <div className="ml-8">
                  <Button onClick={startSetup} variant="outline" size="sm">
                    <Smartphone className="h-4 w-4 mr-2" />
                    QR-Code neu laden
                  </Button>
                </div>
              )}
            </div>

            {/* Step 3: Enter Code */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs">3</span>
                Code eingeben
              </div>

              <div className="ml-8 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Gib den 6-stelligen Code aus deiner Authenticator-App ein:
                </p>

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
                  className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                  autoFocus
                />

                <Button
                  className="w-full"
                  onClick={verifyAndEnable2FA}
                  disabled={verifying || verificationCode.length !== 6}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifiziere...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      2FA aktivieren
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Logout Option */}
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Probleme bei der Einrichtung?{" "}
          <a
            href="mailto:support@nf-mentoring.de"
            className="text-primary hover:underline"
          >
            Support kontaktieren
          </a>
        </p>
      </div>
    </div>
  );
}
