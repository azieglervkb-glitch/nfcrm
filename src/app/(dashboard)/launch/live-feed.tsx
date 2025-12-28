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
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'success_without_ob':
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-muted-foreground" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusBg = (status: ImportLogEntry['status']) => {
    switch (status) {
      case 'success_with_ob':
        return 'bg-green-50 border-green-200';
      case 'success_without_ob':
        return 'bg-amber-50 border-amber-200';
      case 'skipped':
        return 'bg-muted border-border';
      case 'error':
        return 'bg-red-50 border-red-200';
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
      className="max-h-80 overflow-y-auto space-y-2"
    >
      {logs.map((log, index) => (
        <div
          key={`${log.timestamp}-${index}`}
          className={`flex items-start gap-3 p-3 rounded-lg border ${getStatusBg(log.status)}`}
        >
          <div className="mt-0.5">
            {getStatusIcon(log.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{log.name}</span>
              <span className="text-xs text-muted-foreground">{formatTime(log.timestamp)}</span>
            </div>
            <div className="text-sm text-muted-foreground truncate">{log.email}</div>
            <div className="text-sm mt-1">{log.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
