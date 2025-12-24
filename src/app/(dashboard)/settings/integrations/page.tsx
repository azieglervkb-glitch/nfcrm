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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  CreditCard,
  Brain,
  Webhook,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
} from "lucide-react";

interface IntegrationSettings {
  whatsappApiUrl: string;
  whatsappApiKey: string;
  whatsappEnabled: boolean;
  openaiApiKey: string;
  openaiEnabled: boolean;
  copecartWebhookSecret: string;
  copecartEnabled: boolean;
}

export default function IntegrationsSettingsPage() {
  const [settings, setSettings] = useState<IntegrationSettings>({
    whatsappApiUrl: "",
    whatsappApiKey: "",
    whatsappEnabled: false,
    openaiApiKey: "",
    openaiEnabled: false,
    copecartWebhookSecret: "",
    copecartEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const [testResults, setTestResults] = useState<{ [key: string]: "success" | "error" | null }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/settings/integrations");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast({
        title: "Error",
        description: "Failed to load integration settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveIntegration = async (integration: string, data: Partial<IntegrationSettings>) => {
    try {
      setSaving(integration);
      const response = await fetch("/api/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration, ...data }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Integration settings saved",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to save settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const testConnection = async (integration: string) => {
    try {
      setTestResults({ ...testResults, [integration]: null });
      const response = await fetch(`/api/settings/integrations/test?integration=${integration}`);

      if (response.ok) {
        setTestResults({ ...testResults, [integration]: "success" });
        toast({
          title: "Success",
          description: "Connection test passed",
        });
      } else {
        setTestResults({ ...testResults, [integration]: "error" });
        toast({
          title: "Error",
          description: "Connection test failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      setTestResults({ ...testResults, [integration]: "error" });
      toast({
        title: "Error",
        description: "Connection test failed",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const toggleSecret = (key: string) => {
    setShowSecrets({ ...showSecrets, [key]: !showSecrets[key] });
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/copecart`
    : "/api/webhooks/copecart";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-600">Configure external service connections</p>
      </div>

      {/* WhatsApp Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>WhatsApp API</CardTitle>
                <CardDescription>Send automated WhatsApp messages</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {testResults.whatsapp === "success" && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
              {testResults.whatsapp === "error" && (
                <Badge className="bg-red-100 text-red-800">
                  <XCircle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              )}
              <Switch
                checked={settings.whatsappEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, whatsappEnabled: checked })
                }
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsappApiUrl">API URL</Label>
            <Input
              id="whatsappApiUrl"
              value={settings.whatsappApiUrl}
              onChange={(e) =>
                setSettings({ ...settings, whatsappApiUrl: e.target.value })
              }
              placeholder="https://api.whatsapp.com/v1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsappApiKey">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="whatsappApiKey"
                  type={showSecrets.whatsappApiKey ? "text" : "password"}
                  value={settings.whatsappApiKey}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsappApiKey: e.target.value })
                  }
                  placeholder="Enter your API key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => toggleSecret("whatsappApiKey")}
                >
                  {showSecrets.whatsappApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() =>
                saveIntegration("whatsapp", {
                  whatsappApiUrl: settings.whatsappApiUrl,
                  whatsappApiKey: settings.whatsappApiKey,
                  whatsappEnabled: settings.whatsappEnabled,
                })
              }
              disabled={saving === "whatsapp"}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving === "whatsapp" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
            <Button
              variant="outline"
              onClick={() => testConnection("whatsapp")}
              disabled={!settings.whatsappApiKey}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* OpenAI Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle>OpenAI API</CardTitle>
                <CardDescription>Generate AI-powered KPI feedback</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {testResults.openai === "success" && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
              {testResults.openai === "error" && (
                <Badge className="bg-red-100 text-red-800">
                  <XCircle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              )}
              <Switch
                checked={settings.openaiEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, openaiEnabled: checked })
                }
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openaiApiKey">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="openaiApiKey"
                  type={showSecrets.openaiApiKey ? "text" : "password"}
                  value={settings.openaiApiKey}
                  onChange={(e) =>
                    setSettings({ ...settings, openaiApiKey: e.target.value })
                  }
                  placeholder="sk-..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => toggleSecret("openaiApiKey")}
                >
                  {showSecrets.openaiApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() =>
                saveIntegration("openai", {
                  openaiApiKey: settings.openaiApiKey,
                  openaiEnabled: settings.openaiEnabled,
                })
              }
              disabled={saving === "openai"}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving === "openai" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
            <Button
              variant="outline"
              onClick={() => testConnection("openai")}
              disabled={!settings.openaiApiKey}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Copecart Webhook */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Copecart Integration</CardTitle>
                <CardDescription>Receive payment webhooks from Copecart</CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.copecartEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, copecartEnabled: checked })
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="bg-gray-50" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(webhookUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Add this URL to your Copecart webhook settings
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="copecartWebhookSecret">Webhook Secret</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="copecartWebhookSecret"
                  type={showSecrets.copecartWebhookSecret ? "text" : "password"}
                  value={settings.copecartWebhookSecret}
                  onChange={(e) =>
                    setSettings({ ...settings, copecartWebhookSecret: e.target.value })
                  }
                  placeholder="Enter webhook secret from Copecart"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => toggleSecret("copecartWebhookSecret")}
                >
                  {showSecrets.copecartWebhookSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <Button
            onClick={() =>
              saveIntegration("copecart", {
                copecartWebhookSecret: settings.copecartWebhookSecret,
                copecartEnabled: settings.copecartEnabled,
              })
            }
            disabled={saving === "copecart"}
            className="bg-red-600 hover:bg-red-700"
          >
            {saving === "copecart" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </CardContent>
      </Card>

      {/* Webhook Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Webhook className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <CardTitle>Webhook Events</CardTitle>
              <CardDescription>Supported webhook event types</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">payment.completed</p>
                <p className="text-sm text-gray-500">New member registration</p>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">subscription.cancelled</p>
                <p className="text-sm text-gray-500">Member churned</p>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">subscription.renewed</p>
                <p className="text-sm text-gray-500">Subscription renewal</p>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
