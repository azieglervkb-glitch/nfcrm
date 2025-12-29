"use client";

import { useState, useEffect, useCallback } from 'react';
import { SectionHeader } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Rocket,
  Upload,
  RefreshCw,
  Pause,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  FileSpreadsheet,
  Users,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { LiveFeed } from './live-feed';
import { ImportPreview, ImportStatus } from '@/lib/launch/types';

type Phase = 'upload' | 'preview' | 'confirm' | 'running' | 'completed';

export default function LaunchPage() {
  const [phase, setPhase] = useState<Phase>('upload');
  const [csvContent, setCsvContent] = useState<string>('');
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [isDryRun, setIsDryRun] = useState(true);
  const [cooldownSeconds, setCooldownSeconds] = useState(30);

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  // Fetch preview
  const fetchPreview = async () => {
    if (!csvContent) {
      setError('Bitte lade zuerst eine CSV-Datei hoch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/launch/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error + (data.details ? `: ${data.details}` : ''));
      }

      setPreview(data.preview);
      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  // Start import
  const startImport = async () => {
    if (confirmCode !== 'LAUNCH2025') {
      setError('Falscher Bestätigungscode');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/launch/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          isDryRun,
          cooldownMs: cooldownSeconds * 1000,
          confirmationCode: confirmCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Start failed');
      }

      setStatus(data.status);
      setPhase('running');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  // Poll status
  const pollStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/launch/status');
      const data = await response.json();
      setStatus(data.status);

      if (data.status.phase === 'completed') {
        setPhase('completed');
      }
    } catch (err) {
      console.error('Poll error:', err);
    }
  }, []);

  // Pause import
  const pauseImport = async () => {
    try {
      await fetch('/api/launch/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      });
      pollStatus();
    } catch (err) {
      console.error('Pause error:', err);
    }
  };

  // Reset
  const reset = async () => {
    try {
      await fetch('/api/launch/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      setPhase('upload');
      setStatus(null);
      setPreview(null);
      setCsvContent('');
      setCsvFileName('');
      setError(null);
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  // Start polling when running
  useEffect(() => {
    if (phase === 'running') {
      const interval = setInterval(pollStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [phase, pollStatus]);

  // Calculate progress
  const progressPercent = status ? Math.round((status.processed / status.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="Launch Import"
          description="Importiere alle Member von LearningSuite mit Onboarding-Daten"
        />
        {isDryRun && phase !== 'completed' && (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Dry Run aktiv
          </Badge>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Phase: Upload */}
      {phase === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Schritt 1: Onboarding CSV hochladen
            </CardTitle>
            <CardDescription>
              Lade die CSV-Datei mit den Onboarding-Antworten hoch. Die Member werden dann von LearningSuite abgerufen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dry Run Toggle - prominent at top */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg border">
              <div>
                <Label className="text-base font-medium">Dry Run (Testlauf)</Label>
                <p className="text-sm text-muted-foreground">
                  Simuliert Import ohne echte Änderungen in der Datenbank
                </p>
              </div>
              <Switch
                checked={isDryRun}
                onCheckedChange={setIsDryRun}
              />
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <span className="text-primary font-medium hover:underline">
                  Datei auswählen
                </span>
                <span className="text-muted-foreground"> oder hierher ziehen</span>
              </Label>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              {csvFileName && (
                <div className="mt-4 text-green-600 flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {csvFileName}
                </div>
              )}
            </div>

            <Button
              onClick={fetchPreview}
              disabled={!csvContent || loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analysiere...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  LearningSuite abrufen & Vorschau
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Phase: Preview */}
      {phase === 'preview' && preview && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Schritt 2: Matching-Ergebnis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold">{preview.totalFromLS}</div>
                  <div className="text-sm text-muted-foreground">LearningSuite</div>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-muted-foreground">{preview.alreadyInCRM}</div>
                  <div className="text-sm text-muted-foreground">Bereits im CRM</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{preview.withOnboarding}</div>
                  <div className="text-sm text-muted-foreground">Mit Onboarding</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-amber-600">{preview.withoutOnboarding}</div>
                  <div className="text-sm text-muted-foreground">Ohne Onboarding</div>
                </div>
              </div>

              {/* Import Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Zu importieren:</span>
                  <span className="text-2xl font-bold">{preview.toImport} Member</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Geschätzte Dauer:
                  </span>
                  <span>~{preview.estimatedMinutes} Minuten</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>Import-Einstellungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg border">
                <div>
                  <Label className="text-base font-medium">Dry Run (Testlauf)</Label>
                  <p className="text-sm text-muted-foreground">
                    Simuliert Import ohne echte Änderungen
                  </p>
                </div>
                <Switch
                  checked={isDryRun}
                  onCheckedChange={setIsDryRun}
                />
              </div>

              <div>
                <Label>Cooldown zwischen Importen (Sekunden)</Label>
                <Input
                  type="number"
                  value={cooldownSeconds}
                  onChange={(e) => setCooldownSeconds(Number(e.target.value))}
                  min={5}
                  max={120}
                  className="mt-1 w-32"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Neue Dauer: ~{Math.ceil((preview.toImport * cooldownSeconds) / 60)} Minuten
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setPhase('upload')}
              className="flex-1"
            >
              Zurück
            </Button>
            <Button
              onClick={() => setPhase('confirm')}
              className="flex-1"
            >
              Weiter zur Bestätigung
            </Button>
          </div>
        </div>
      )}

      {/* Phase: Confirm */}
      {phase === 'confirm' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Schritt 3: Import bestätigen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isDryRun ? (
              <div className="flex items-center gap-2 p-4 rounded-lg border border-yellow-400 bg-yellow-50 text-yellow-800">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>
                  <strong>TESTLAUF</strong> - Keine echten Änderungen werden vorgenommen
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>
                  <strong>ACHTUNG</strong> - {preview?.toImport} Member werden importiert!
                </span>
              </div>
            )}

            <div>
              <Label>Bestätigungscode eingeben:</Label>
              <Input
                type="text"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
                placeholder="LAUNCH2025"
                className="text-center text-2xl tracking-widest font-mono mt-2 h-14"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Gib &quot;LAUNCH2025&quot; ein um den Import zu starten
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setPhase('preview')}
                className="flex-1"
              >
                Zurück
              </Button>
              <Button
                onClick={startImport}
                disabled={loading || confirmCode !== 'LAUNCH2025'}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    {isDryRun ? 'Testlauf starten' : 'Import starten'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase: Running */}
      {phase === 'running' && status && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {status.isDryRun ? 'Testlauf läuft...' : 'Import läuft...'}
                </CardTitle>
                {status.isDryRun && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                    Dry Run
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    {status.processed} / {status.total} Member
                  </span>
                  <span className="font-medium">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-3" />
                <div className="text-right text-sm text-muted-foreground mt-1">
                  ~{status.estimatedRemainingMinutes} min verbleibend
                </div>
              </div>

              {/* Current Member */}
              {status.currentMember && (
                <div className="bg-muted rounded-lg p-3 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Importiere: <strong>{status.currentMember}</strong></span>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <UserCheck className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <div className="text-xl font-bold text-green-600">{status.withOnboarding}</div>
                  <div className="text-xs text-muted-foreground">Mit Onboarding</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                  <UserX className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                  <div className="text-xl font-bold text-amber-600">{status.withoutOnboarding}</div>
                  <div className="text-xs text-muted-foreground">Ohne Onboarding</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <Users className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <div className="text-xl font-bold">{status.skipped}</div>
                  <div className="text-xs text-muted-foreground">Übersprungen</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                  <div className="text-xl font-bold text-red-600">{status.errors}</div>
                  <div className="text-xs text-muted-foreground">Fehler</div>
                </div>
              </div>

              {/* Pause Button */}
              <Button
                onClick={pauseImport}
                variant="outline"
                className="w-full"
              >
                <Pause className="mr-2 h-4 w-4" />
                Pausieren
              </Button>
            </CardContent>
          </Card>

          {/* Live Feed */}
          <Card>
            <CardHeader>
              <CardTitle>Live Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <LiveFeed logs={status.logs} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Phase: Completed */}
      {phase === 'completed' && status && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">
                {status.isDryRun ? 'Testlauf abgeschlossen' : 'Import erfolgreich!'}
              </CardTitle>
              <CardDescription className="text-lg">
                {status.processed - status.skipped} neue Member {status.isDryRun ? 'würden importiert werden' : 'importiert'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Final Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-600">{status.withOnboarding}</div>
                  <div className="text-xs text-muted-foreground">Mit Onboarding</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-600">{status.withoutOnboarding}</div>
                  <div className="text-xs text-muted-foreground">Ohne Onboarding</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-xl font-bold">{status.skipped}</div>
                  <div className="text-xs text-muted-foreground">Übersprungen</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-red-600">{status.errors}</div>
                  <div className="text-xs text-muted-foreground">Fehler</div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gestartet:</span>
                  <span>{status.startedAt ? new Date(status.startedAt).toLocaleString('de-DE') : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Beendet:</span>
                  <span>{status.completedAt ? new Date(status.completedAt).toLocaleString('de-DE') : '-'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const logText = status.logs.map(l =>
                      `${l.timestamp}\t${l.status}\t${l.name}\t${l.email}\t${l.message}`
                    ).join('\n');
                    const blob = new Blob([logText], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `launch-log-${new Date().toISOString().split('T')[0]}.txt`;
                    a.click();
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Log herunterladen
                </Button>
                <Button
                  variant="outline"
                  onClick={reset}
                  className="flex-1"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Neuer Import
                </Button>
                <Button
                  onClick={() => window.location.href = '/members'}
                  className="flex-1"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Zu den Members
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Log */}
          <Card>
            <CardHeader>
              <CardTitle>Import-Log</CardTitle>
            </CardHeader>
            <CardContent>
              <LiveFeed logs={status.logs} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
