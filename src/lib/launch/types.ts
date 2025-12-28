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
  phone?: string; // Raw phone from LS API
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
  phone?: string;
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

/**
 * Format phone number for WhatsApp (German format)
 * Converts various formats to +49XXXXXXXXXXX
 *
 * Examples:
 *   "0171 1234567" -> "+491711234567"
 *   "+49 171 1234567" -> "+491711234567"
 *   "0049 171 123 45 67" -> "+491711234567"
 *   "171-1234567" -> "+491711234567"
 *   "" or null -> null
 */
export function formatPhoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone || phone.trim() === '') return null;

  // Remove all non-digit characters except leading +
  const cleaned = phone.trim();

  // Extract digits only (we'll handle the + prefix separately)
  const hasPlus = cleaned.startsWith('+');
  const digits = cleaned.replace(/\D/g, '');

  if (digits.length < 8) return null; // Too short to be valid

  let formatted: string;

  if (digits.startsWith('49') && digits.length >= 11) {
    // Already has German country code (49...)
    formatted = '+' + digits;
  } else if (digits.startsWith('0049')) {
    // Has 0049... format
    formatted = '+' + digits.slice(2);
  } else if (digits.startsWith('0')) {
    // German domestic format (0171...)
    formatted = '+49' + digits.slice(1);
  } else if (hasPlus) {
    // Already has + prefix with digits
    formatted = '+' + digits;
  } else {
    // Assume it's a German number without prefix (171...)
    formatted = '+49' + digits;
  }

  // Final validation: should be +49 followed by 9-13 digits (mobile + landline)
  if (!/^\+49\d{9,13}$/.test(formatted)) {
    console.warn(`[Launch] Invalid phone format after normalization: "${phone}" -> "${formatted}"`);
    return null;
  }

  return formatted;
}

/**
 * Format phone number for display (with spaces)
 * +491711234567 -> +49 171 1234567
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string | null {
  if (!phone) return null;

  const whatsappFormat = formatPhoneForWhatsApp(phone);
  if (!whatsappFormat) return null;

  // +49 XXX XXXXXXX format
  const digits = whatsappFormat.slice(3); // Remove +49
  if (digits.length >= 10) {
    return `+49 ${digits.slice(0, 3)} ${digits.slice(3)}`;
  }
  return whatsappFormat;
}
