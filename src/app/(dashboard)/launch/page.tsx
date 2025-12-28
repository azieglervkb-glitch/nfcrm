"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Rocket,
  Upload,
  RefreshCw,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  PartyPopper,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { Fireworks, ConfettiExplosion } from './fireworks';
import { LiveFeed, StatsBoxes } from './live-feed';
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
  const [showConfetti, setShowConfetti] = useState(false);
  const [fireworksIntensity, setFireworksIntensity] = useState(0.3);

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
        throw new Error(data.error || 'Preview failed');
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
      setFireworksIntensity(0.5);
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

      // Check for completion
      if (data.status.phase === 'completed') {
        setPhase('completed');
        setFireworksIntensity(1);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      // Check for milestones
      if (data.status.processed > 0 && status?.processed) {
        const prevPercent = Math.floor((status.processed / status.total) * 4);
        const newPercent = Math.floor((data.status.processed / data.status.total) * 4);
        if (newPercent > prevPercent) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2000);
        }
      }
    } catch (err) {
      console.error('Poll error:', err);
    }
  }, [status?.processed, status?.total]);

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Fireworks Background */}
      <Fireworks intensity={fireworksIntensity} />
      <ConfettiExplosion trigger={showConfetti} />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-500/30 rounded-full px-4 py-2 mb-4">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-amber-200 text-sm font-medium">01.01.2025</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            <span className="bg-gradient-to-r from-amber-400 via-red-400 to-amber-400 bg-clip-text text-transparent">
              NF MENTORING
            </span>
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            CRM LAUNCH 🚀
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            Ein neues Jahr. Ein neues System. Neue Erfolge.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Phase: Upload */}
        {phase === 'upload' && (
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Schritt 1: Onboarding CSV hochladen
              </CardTitle>
              <CardDescription className="text-gray-400">
                Lade die CSV-Datei mit den Onboarding-Antworten hoch
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-amber-500/50 transition-colors">
                <FileSpreadsheet className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <span className="text-amber-400 hover:text-amber-300 font-medium">
                    Datei auswählen
                  </span>
                  <span className="text-gray-400"> oder hierher ziehen</span>
                </Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {csvFileName && (
                  <div className="mt-4 text-green-400 flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {csvFileName}
                  </div>
                )}
              </div>

              <Button
                onClick={fetchPreview}
                disabled={!csvContent || loading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold h-12"
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
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                Schritt 2: Matching-Ergebnis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-white">{preview.totalFromLS}</div>
                  <div className="text-sm text-gray-400">LearningSuite</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-gray-400">{preview.alreadyInCRM}</div>
                  <div className="text-sm text-gray-400">Bereits im CRM</div>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-400">{preview.withOnboarding}</div>
                  <div className="text-sm text-gray-400">Mit Onboarding</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-amber-400">{preview.withoutOnboarding}</div>
                  <div className="text-sm text-gray-400">Ohne Onboarding</div>
                </div>
              </div>

              {/* Import Summary */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Zu importieren:</span>
                  <span className="text-2xl font-bold text-white">{preview.toImport} Member</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-400 text-sm">Geschätzte Dauer:</span>
                  <span className="text-amber-400">~{preview.estimatedMinutes} Minuten</span>
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Dry Run (Testlauf)</Label>
                    <p className="text-xs text-gray-400">Simuliert Import ohne echte Änderungen</p>
                  </div>
                  <Switch
                    checked={isDryRun}
                    onCheckedChange={setIsDryRun}
                  />
                </div>

                <div>
                  <Label className="text-white">Cooldown (Sekunden)</Label>
                  <Input
                    type="number"
                    value={cooldownSeconds}
                    onChange={(e) => setCooldownSeconds(Number(e.target.value))}
                    min={5}
                    max={120}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
              </div>

              <Button
                onClick={() => setPhase('confirm')}
                className="w-full bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white font-bold h-12"
              >
                Weiter zur Bestätigung
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Phase: Confirm */}
        {phase === 'confirm' && (
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Rocket className="h-5 w-5 text-amber-400" />
                Schritt 3: Launch bestätigen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-amber-200 text-center">
                  {isDryRun ? (
                    <>🧪 <strong>TESTLAUF</strong> - Keine echten Änderungen werden vorgenommen</>
                  ) : (
                    <>⚠️ <strong>ACHTUNG</strong> - {preview?.toImport} Member werden importiert!</>
                  )}
                </p>
              </div>

              <div>
                <Label className="text-white">Bestätigungscode eingeben:</Label>
                <Input
                  type="text"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
                  placeholder="LAUNCH2025"
                  className="bg-gray-700 border-gray-600 text-white text-center text-2xl tracking-widest font-mono mt-2 h-14"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setPhase('preview')}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Zurück
                </Button>
                <Button
                  onClick={startImport}
                  disabled={loading || confirmCode !== 'LAUNCH2025'}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white font-bold h-12"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Rocket className="mr-2 h-5 w-5" />
                      {isDryRun ? 'TESTLAUF STARTEN' : 'LAUNCH STARTEN'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Phase: Running */}
        {phase === 'running' && status && (
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {status.isDryRun ? (
                  <>🧪 TESTLAUF LÄUFT</>
                ) : (
                  <>🚀 LAUNCH LÄUFT</>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">
                    {status.processed} / {status.total} Member
                  </span>
                  <span className="text-amber-400">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-3" />
                <div className="text-right text-sm text-gray-500 mt-1">
                  ~{status.estimatedRemainingMinutes} min verbleibend
                </div>
              </div>

              {/* Current Member */}
              {status.currentMember && (
                <div className="bg-gray-700/30 rounded-lg p-3 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                  <span className="text-white">Importiere: {status.currentMember}</span>
                </div>
              )}

              {/* Stats */}
              <StatsBoxes
                withOnboarding={status.withOnboarding}
                withoutOnboarding={status.withoutOnboarding}
                skipped={status.skipped}
                errors={status.errors}
              />

              {/* Live Feed */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">Live Feed</h3>
                <LiveFeed logs={status.logs} />
              </div>

              {/* Pause Button */}
              <Button
                onClick={pauseImport}
                variant="outline"
                className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
              >
                <Pause className="mr-2 h-4 w-4" />
                Pausieren
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Phase: Completed */}
        {phase === 'completed' && status && (
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur">
            <CardHeader className="text-center">
              <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <PartyPopper className="h-10 w-10 text-green-400" />
              </div>
              <CardTitle className="text-3xl text-white">
                {status.isDryRun ? '🧪 TESTLAUF ABGESCHLOSSEN' : '🎉 LAUNCH ERFOLGREICH!'}
              </CardTitle>
              <CardDescription className="text-gray-400 text-lg">
                {status.processed - status.skipped} neue Member importiert
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Final Stats */}
              <StatsBoxes
                withOnboarding={status.withOnboarding}
                withoutOnboarding={status.withoutOnboarding}
                skipped={status.skipped}
                errors={status.errors}
              />

              {/* Summary */}
              <div className="bg-gray-700/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Gestartet:</span>
                  <span className="text-white">{status.startedAt ? new Date(status.startedAt).toLocaleString('de-DE') : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Beendet:</span>
                  <span className="text-white">{status.completedAt ? new Date(status.completedAt).toLocaleString('de-DE') : '-'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
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
                  onClick={() => window.location.href = '/members'}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Zu den Members
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
