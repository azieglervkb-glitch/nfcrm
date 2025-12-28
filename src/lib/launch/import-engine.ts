/**
 * Launch Import Engine
 * Handles the actual member import with cooldowns
 *
 * CRITICAL: This runs LIVE on launch day - robust error handling essential!
 */

import { prisma } from '@/lib/prisma';
import { sendEmail, sendOnboardingInviteEmail } from '@/lib/email';
import { generateFormUrl } from '@/lib/app-url';
import { randomBytes } from 'crypto';
import {
  ImportStatus,
  ImportLogEntry,
  ImportConfig,
  OnboardingIndex,
  LSMember,
  DEFAULT_IMPORT_CONFIG,
  formatPhoneForWhatsApp,
  formatPhoneForDisplay,
} from './types';
import { findOnboardingByName } from './csv-parser';

// Global import state (in-memory for this session)
let currentImportStatus: ImportStatus = {
  phase: 'idle',
  isDryRun: false,
  total: 0,
  processed: 0,
  skipped: 0,
  withOnboarding: 0,
  withoutOnboarding: 0,
  errors: 0,
  currentMember: null,
  startedAt: null,
  completedAt: null,
  estimatedRemainingMinutes: 0,
  logs: [],
};

let importAbortController: AbortController | null = null;

/**
 * Get current import status
 */
export function getImportStatus(): ImportStatus {
  return { ...currentImportStatus };
}

/**
 * Reset import status
 */
export function resetImportStatus(): void {
  currentImportStatus = {
    phase: 'idle',
    isDryRun: false,
    total: 0,
    processed: 0,
    skipped: 0,
    withOnboarding: 0,
    withoutOnboarding: 0,
    errors: 0,
    currentMember: null,
    startedAt: null,
    completedAt: null,
    estimatedRemainingMinutes: 0,
    logs: [],
  };
  importAbortController = null;
}

/**
 * Pause the import
 */
export function pauseImport(): void {
  if (currentImportStatus.phase === 'running') {
    currentImportStatus.phase = 'paused';
    importAbortController?.abort();
  }
}

/**
 * Add log entry
 */
function addLog(entry: Omit<ImportLogEntry, 'timestamp'>): void {
  currentImportStatus.logs.unshift({
    ...entry,
    timestamp: new Date().toISOString(),
  });
  // Keep only last 100 logs
  if (currentImportStatus.logs.length > 100) {
    currentImportStatus.logs = currentImportStatus.logs.slice(0, 100);
  }
}

/**
 * Sleep helper with abort support
 */
async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Aborted'));
    });
  });
}

/**
 * Retry helper for transient errors
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  operation: string = 'operation'
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[Launch] ${operation} attempt ${attempt}/${maxRetries} failed:`, lastError.message);

      if (attempt < maxRetries) {
        await sleep(delayMs * attempt); // Exponential backoff
      }
    }
  }

  throw lastError;
}

/**
 * Validate required member data before import
 */
function validateMemberData(lsMember: LSMember): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!lsMember.email || !lsMember.email.includes('@')) {
    issues.push('Keine gültige E-Mail');
  }

  if (!lsMember.firstName?.trim()) {
    issues.push('Kein Vorname');
  }

  if (!lsMember.lastName?.trim()) {
    issues.push('Kein Nachname');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Import a single member with full error handling
 */
async function importSingleMember(
  lsMember: LSMember,
  onboardingIndex: OnboardingIndex,
  config: ImportConfig
): Promise<'skipped' | 'success_with_ob' | 'success_without_ob' | 'error'> {
  const { email, firstName, lastName, phone } = lsMember;
  const fullName = `${firstName} ${lastName}`;
  currentImportStatus.currentMember = fullName;

  // Validate member data
  const validation = validateMemberData(lsMember);
  if (!validation.valid) {
    addLog({
      email: email || 'N/A',
      name: fullName || 'Unbekannt',
      status: 'error',
      message: `Validierung fehlgeschlagen: ${validation.issues.join(', ')}`,
    });
    return 'error';
  }

  try {
    // Check if already exists in CRM (with retry for DB connection issues)
    const existing = await withRetry(
      () => prisma.member.findUnique({ where: { email: email.toLowerCase() } }),
      3,
      500,
      'DB lookup'
    );

    if (existing) {
      addLog({
        email,
        name: fullName,
        status: 'skipped',
        message: 'Bereits im CRM vorhanden',
      });
      return 'skipped';
    }

    // Check for onboarding data
    const onboardingData = findOnboardingByName(onboardingIndex, firstName, lastName);
    const hasOnboarding = !!onboardingData;

    // Format phone number for WhatsApp
    const whatsappNummer = formatPhoneForWhatsApp(phone);
    const telefon = formatPhoneForDisplay(phone);

    if (config.isDryRun) {
      // Dry run - don't actually create
      const phoneInfo = whatsappNummer ? ` (Tel: ${telefon})` : ' (keine Tel.)';
      addLog({
        email,
        name: fullName,
        status: hasOnboarding ? 'success_with_ob' : 'success_without_ob',
        message: `[DRY RUN] Würde importiert${phoneInfo} ${hasOnboarding ? 'MIT' : 'OHNE'} Onboarding`,
      });
      return hasOnboarding ? 'success_with_ob' : 'success_without_ob';
    }

    // Create member with retry
    const memberData: Parameters<typeof prisma.member.create>[0]['data'] = {
      email: email.toLowerCase(),
      vorname: firstName.trim(),
      nachname: lastName.trim(),
      telefon: telefon,
      whatsappNummer: whatsappNummer,
      status: 'AKTIV',
      produkte: ['NFM'],
      // LearningSuite reference
      learningSuiteUserId: lsMember.id,
      // Onboarding status
      onboardingCompleted: hasOnboarding,
      onboardingDate: hasOnboarding ? new Date() : undefined,
      // Mark as imported with progress (for onboarding trigger logic)
      importedWithProgress: true,
    };

    // Add onboarding data if available
    if (onboardingData) {
      Object.assign(memberData, {
        aktuellerMonatsumsatz: onboardingData.aktuellerMonatsumsatz,
        zielMonatsumsatz: onboardingData.zielMonatsumsatz,
        wasNervtAmMeisten: onboardingData.wasNervtAmMeisten,
        groessetesProblem: onboardingData.groessetesProblem,
        groessteZielWarum: onboardingData.groessteZielWarum,
        wieAufmerksam: onboardingData.wieAufmerksam,
      });
    }

    const newMember = await withRetry(
      () => prisma.member.create({ data: memberData }),
      3,
      1000,
      'Member erstellen'
    );

    console.log(`[Launch] Created member: ${newMember.id} (${email})`);

    // Send appropriate communication (with fallback - import succeeds even if email fails)
    let emailSent = false;
    let emailError: string | null = null;

    try {
      if (hasOnboarding) {
        await sendKpiSetupInvite(newMember);
        emailSent = true;
      } else {
        await sendOnboardingInvite(newMember);
        emailSent = true;
      }
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Unbekannter E-Mail-Fehler';
      console.error(`[Launch] Email failed for ${email}:`, error);
      // Don't fail the import - just log the email issue
    }

    // Build success message
    const phoneInfo = whatsappNummer ? ` | WhatsApp: ✓` : ' | WhatsApp: ✗';
    const emailInfo = emailSent ? '' : ` | E-Mail-Fehler: ${emailError}`;
    const actionInfo = hasOnboarding ? 'KPI-Setup gesendet' : 'Onboarding gesendet';

    addLog({
      email,
      name: fullName,
      status: hasOnboarding ? 'success_with_ob' : 'success_without_ob',
      message: `Importiert${phoneInfo}${emailInfo} → ${emailSent ? actionInfo : 'Manuell nachholen!'}`,
    });

    return hasOnboarding ? 'success_with_ob' : 'success_without_ob';

  } catch (error) {
    console.error(`[Launch] Error importing ${email}:`, error);
    addLog({
      email,
      name: fullName,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
    return 'error';
  }
}

/**
 * Send onboarding invite to a member
 */
async function sendOnboardingInvite(member: {
  id: string;
  email: string;
  vorname: string;
  nachname: string;
}): Promise<void> {
  // Create form token with retry
  const token = randomBytes(32).toString('hex');
  await withRetry(
    () => prisma.formToken.create({
      data: {
        token,
        memberId: member.id,
        type: 'onboarding',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    }),
    3,
    500,
    'FormToken erstellen'
  );

  // Send email with retry
  await withRetry(
    () => sendOnboardingInviteEmail({
      id: member.id,
      email: member.email,
      vorname: member.vorname,
      nachname: member.nachname,
    }, token),
    2,
    1000,
    'Onboarding E-Mail senden'
  );
}

/**
 * Send KPI setup invite to a member
 */
async function sendKpiSetupInvite(member: {
  id: string;
  email: string;
  vorname: string;
  nachname: string;
}): Promise<void> {
  // Enable KPI tracking with retry
  await withRetry(
    () => prisma.member.update({
      where: { id: member.id },
      data: { kpiTrackingEnabled: true },
    }),
    3,
    500,
    'KPI aktivieren'
  );

  // Create form token with retry
  const token = randomBytes(32).toString('hex');
  await withRetry(
    () => prisma.formToken.create({
      data: {
        token,
        memberId: member.id,
        type: 'kpi-setup',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    }),
    3,
    500,
    'FormToken erstellen'
  );

  const kpiSetupUrl = generateFormUrl('kpi-setup', token);

  // Send email with retry
  await withRetry(
    () => sendEmail({
      to: member.email,
      subject: '📊 Dein persönliches KPI-Tracking einrichten',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #ffffff; padding: 40px 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <p style="font-size: 18px; color: #111827;">Hey ${member.vorname}! 👋</p>
            <p style="color: #6b7280; line-height: 1.6;">
              Willkommen im NF Mentoring CRM! 🎉
            </p>
            <p style="color: #6b7280; line-height: 1.6;">
              Um dich optimal unterstützen zu können, bitten wir dich, dein persönliches KPI-Tracking einzurichten.
              Das dauert nur 5 Minuten und hilft uns, deine Fortschritte zu verfolgen.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${kpiSetupUrl}" style="background: #ae1d2b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                KPI-Tracking einrichten →
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 14px; text-align: center;">
              NF Mentoring | <a href="https://nf-mentoring.de" style="color: #ae1d2b;">nf-mentoring.de</a>
            </p>
          </div>
        </div>
      `,
    }),
    2,
    1000,
    'KPI-Setup E-Mail senden'
  );
}

/**
 * Start the import process
 */
export async function startImport(
  members: LSMember[],
  onboardingIndex: OnboardingIndex,
  config: Partial<ImportConfig> = {}
): Promise<void> {
  const finalConfig: ImportConfig = { ...DEFAULT_IMPORT_CONFIG, ...config };

  // Pre-flight validation
  if (members.length === 0) {
    console.log('[Launch] No members to import');
    return;
  }

  // Initialize status
  currentImportStatus = {
    phase: 'running',
    isDryRun: finalConfig.isDryRun,
    total: members.length,
    processed: 0,
    skipped: 0,
    withOnboarding: 0,
    withoutOnboarding: 0,
    errors: 0,
    currentMember: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    estimatedRemainingMinutes: Math.ceil((members.length * finalConfig.cooldownMs) / 60000),
    logs: [],
  };

  importAbortController = new AbortController();

  console.log(`[Launch] Starting import of ${members.length} members (isDryRun: ${finalConfig.isDryRun})`);
  console.log(`[Launch] Onboarding index has ${onboardingIndex.size} entries`);

  // Log start
  addLog({
    email: '',
    name: 'SYSTEM',
    status: 'success_with_ob',
    message: `Import gestartet: ${members.length} Member${finalConfig.isDryRun ? ' (DRY RUN)' : ''}`,
  });

  try {
    for (let i = 0; i < members.length; i++) {
      // Check if paused/aborted
      if (currentImportStatus.phase !== 'running') {
        console.log('[Launch] Import paused/stopped');
        addLog({
          email: '',
          name: 'SYSTEM',
          status: 'skipped',
          message: 'Import pausiert/gestoppt',
        });
        break;
      }

      const member = members[i];
      const result = await importSingleMember(member, onboardingIndex, finalConfig);

      // Update counts
      currentImportStatus.processed++;
      switch (result) {
        case 'skipped':
          currentImportStatus.skipped++;
          break;
        case 'success_with_ob':
          currentImportStatus.withOnboarding++;
          break;
        case 'success_without_ob':
          currentImportStatus.withoutOnboarding++;
          break;
        case 'error':
          currentImportStatus.errors++;
          break;
      }

      // Update estimated time
      const remaining = members.length - i - 1;
      currentImportStatus.estimatedRemainingMinutes = Math.ceil((remaining * finalConfig.cooldownMs) / 60000);

      // Cooldown (except for last member)
      if (i < members.length - 1 && currentImportStatus.phase === 'running') {
        try {
          await sleep(finalConfig.cooldownMs, importAbortController.signal);
        } catch {
          // Aborted
          break;
        }
      }
    }

    // Complete
    if (currentImportStatus.phase === 'running') {
      currentImportStatus.phase = 'completed';
    }
    currentImportStatus.completedAt = new Date().toISOString();
    currentImportStatus.currentMember = null;
    currentImportStatus.estimatedRemainingMinutes = 0;

    // Log completion
    addLog({
      email: '',
      name: 'SYSTEM',
      status: 'success_with_ob',
      message: `Import abgeschlossen: ${currentImportStatus.withOnboarding + currentImportStatus.withoutOnboarding} importiert, ${currentImportStatus.skipped} übersprungen, ${currentImportStatus.errors} Fehler`,
    });

    console.log(`[Launch] Import completed:`, {
      processed: currentImportStatus.processed,
      skipped: currentImportStatus.skipped,
      withOnboarding: currentImportStatus.withOnboarding,
      withoutOnboarding: currentImportStatus.withoutOnboarding,
      errors: currentImportStatus.errors,
    });

  } catch (error) {
    console.error('[Launch] Fatal import error:', error);
    currentImportStatus.phase = 'error';
    currentImportStatus.completedAt = new Date().toISOString();
    addLog({
      email: '',
      name: 'SYSTEM',
      status: 'error',
      message: `Fataler Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`,
    });
  }
}
