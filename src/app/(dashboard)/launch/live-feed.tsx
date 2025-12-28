"use client";

import { useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, SkipForward, XCircle } from 'lucide-react';
import { ImportLogEntry } from '@/lib/launch/types';

interface LiveFeedProps {
  logs: ImportLogEntry[];
}

export function LiveFeed({ logs }: LiveFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to top when new logs arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs.length]);

  const getStatusIcon = (status: ImportLogEntry['status']) => {
    switch (status) {
      case 'success_with_ob':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'success_without_ob':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'skipped':
        return <SkipForward className="h-5 w-5 text-gray-400" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBg = (status: ImportLogEntry['status']) => {
    switch (status) {
      case 'success_with_ob':
        return 'bg-green-500/10 border-green-500/20';
      case 'success_without_ob':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'skipped':
        return 'bg-gray-500/10 border-gray-500/20';
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (logs.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Warte auf Import-Start...
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-64 overflow-y-auto space-y-2 pr-2"
      style={{ scrollBehavior: 'smooth' }}
    >
      {logs.map((log, index) => (
        <div
          key={`${log.timestamp}-${index}`}
          className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-300 ${getStatusBg(log.status)}`}
          style={{
            animation: index === 0 ? 'slideIn 0.3s ease-out' : undefined,
          }}
        >
          {getStatusIcon(log.status)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{log.name}</span>
              <span className="text-xs text-muted-foreground">{formatTime(log.timestamp)}</span>
            </div>
            <div className="text-sm text-muted-foreground truncate">{log.email}</div>
            <div className="text-sm mt-1">{log.message}</div>
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

// Stats boxes component
interface StatsBoxesProps {
  withOnboarding: number;
  withoutOnboarding: number;
  skipped: number;
  errors: number;
}

export function StatsBoxes({ withOnboarding, withoutOnboarding, skipped, errors }: StatsBoxesProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-green-500">{withOnboarding}</div>
        <div className="text-xs text-muted-foreground">Mit Onboarding</div>
      </div>
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-amber-500">{withoutOnboarding}</div>
        <div className="text-xs text-muted-foreground">Ohne Onboarding</div>
      </div>
      <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-gray-400">{skipped}</div>
        <div className="text-xs text-muted-foreground">Übersprungen</div>
      </div>
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-red-500">{errors}</div>
        <div className="text-xs text-muted-foreground">Fehler</div>
      </div>
    </div>
  );
}
