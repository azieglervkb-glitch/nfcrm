/**
 * Launch Day Types
 * Temporary module for the 01.01.2025 member import
 */

// CSV Onboarding Data (parsed from uploaded CSV)
export interface OnboardingCsvRow {
  vorname: string;
  nachname: string;
  aktuellerMonatsumsatz: number | null;
  zielMonatsumsatz: number | null;
  wasNervtAmMeisten: string | null;
  groessetesProblem: string | null;
  groessteZielWarum: string | null;
  wieAufmerksam: string | null;
}

// Indexed onboarding data for fast lookup
export type OnboardingIndex = Map<string, OnboardingCsvRow>;

// LearningSuite member from API
export interface LSMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  createdAt?: string;
}

// Import preview result
export interface ImportPreview {
  totalFromLS: number;
  alreadyInCRM: number;
  toImport: number;
  withOnboarding: number;
  withoutOnboarding: number;
  estimatedMinutes: number;
  members: ImportMemberPreview[];
}

export interface ImportMemberPreview {
  email: string;
  vorname: string;
  nachname: string;
  hasOnboarding: boolean;
  alreadyInCRM: boolean;
  action: 'skip' | 'import_with_onboarding' | 'import_without_onboarding';
}

// Import status for live updates
export interface ImportStatus {
  phase: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  isDryRun: boolean;
  total: number;
  processed: number;
  skipped: number;
  withOnboarding: number;
  withoutOnboarding: number;
  errors: number;
  currentMember: string | null;
  startedAt: string | null;
  completedAt: string | null;
  estimatedRemainingMinutes: number;
  logs: ImportLogEntry[];
}

export interface ImportLogEntry {
  timestamp: string;
  email: string;
  name: string;
  status: 'success_with_ob' | 'success_without_ob' | 'skipped' | 'error';
  message: string;
}

// Import configuration
export interface ImportConfig {
  cooldownMs: number;
  isDryRun: boolean;
  courseId: string;
}

export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
  cooldownMs: 30000, // 30 seconds
  isDryRun: false,
  courseId: 'Q291cnNISW5zdGFuY2U6Y2x4OWk2dXRsM3RiaWR5aWtzeDN3N2U3bA', // NF Mentoring
};
