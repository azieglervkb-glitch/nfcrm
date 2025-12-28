/**
 * Launch Start API
 * POST: Start the import process
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { parseOnboardingCSV } from '@/lib/launch/csv-parser';
import { getAllCourseMembers } from '@/lib/launch/learningsuite-members';
import { startImport, getImportStatus, resetImportStatus } from '@/lib/launch/import-engine';
import { DEFAULT_IMPORT_CONFIG } from '@/lib/launch/types';

export async function POST(request: NextRequest) {
  // Auth check - only SUPER_ADMIN
  const session = await auth();
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { csvContent, courseId, cooldownMs, isDryRun, confirmationCode } = await request.json();

    // Verify confirmation code
    if (confirmationCode !== 'LAUNCH2025') {
      return NextResponse.json({ error: 'Invalid confirmation code' }, { status: 400 });
    }

    // Check if import is already running
    const currentStatus = getImportStatus();
    if (currentStatus.phase === 'running') {
      return NextResponse.json({
        error: 'Import already running',
        status: currentStatus,
      }, { status: 409 });
    }

    if (!csvContent) {
      return NextResponse.json({ error: 'CSV content required' }, { status: 400 });
    }

    // Reset status
    resetImportStatus();

    // Parse onboarding CSV
    console.log('[Launch Start] Parsing CSV...');
    const { index: onboardingIndex, validRows } = parseOnboardingCSV(csvContent);
    console.log(`[Launch Start] Parsed ${validRows} valid rows from CSV`);

    // Fetch members from LearningSuite
    console.log('[Launch Start] Fetching LearningSuite members...');
    const lsResult = await getAllCourseMembers(courseId || DEFAULT_IMPORT_CONFIG.courseId);

    if (!lsResult.success) {
      return NextResponse.json({
        error: 'Failed to fetch LearningSuite members',
        details: lsResult.error,
      }, { status: 500 });
    }

    const lsMembers = lsResult.members;
    console.log(`[Launch Start] Starting import of ${lsMembers.length} members`);

    // Start import in background (don't await)
    startImport(lsMembers, onboardingIndex, {
      cooldownMs: cooldownMs || DEFAULT_IMPORT_CONFIG.cooldownMs,
      isDryRun: isDryRun || false,
      courseId: courseId || DEFAULT_IMPORT_CONFIG.courseId,
    }).catch(error => {
      console.error('[Launch Start] Background import error:', error);
    });

    // Return immediately with initial status
    return NextResponse.json({
      success: true,
      message: isDryRun ? 'Dry run started' : 'Import started',
      status: getImportStatus(),
    });
  } catch (error) {
    console.error('[Launch Start] Error:', error);
    return NextResponse.json({
      error: 'Failed to start import',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
