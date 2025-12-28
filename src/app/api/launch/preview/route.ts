/**
 * Launch Preview API
 * POST: Parse CSV + fetch LS members + calculate matching preview
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseOnboardingCSV, normalizeName } from '@/lib/launch/csv-parser';
import { getAllCourseMembers } from '@/lib/launch/learningsuite-members';
import { ImportPreview, ImportMemberPreview, DEFAULT_IMPORT_CONFIG } from '@/lib/launch/types';

export async function POST(request: NextRequest) {
  // Auth check - only SUPER_ADMIN
  const session = await auth();
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { csvContent, courseId } = await request.json();

    if (!csvContent) {
      return NextResponse.json({ error: 'CSV content required' }, { status: 400 });
    }

    // Parse onboarding CSV
    console.log('[Launch Preview] Parsing CSV...');
    const { index: onboardingIndex, totalRows, validRows, errors: csvErrors } = parseOnboardingCSV(csvContent);
    console.log(`[Launch Preview] Parsed ${validRows}/${totalRows} valid rows from CSV`);

    // Fetch members from LearningSuite
    console.log('[Launch Preview] Fetching LearningSuite members...');
    const lsResult = await getAllCourseMembers(courseId || DEFAULT_IMPORT_CONFIG.courseId);

    if (!lsResult.success) {
      return NextResponse.json({
        error: 'Failed to fetch LearningSuite members',
        details: lsResult.error,
      }, { status: 500 });
    }

    const lsMembers = lsResult.members;
    console.log(`[Launch Preview] Found ${lsMembers.length} members in LearningSuite`);

    // Get existing CRM members
    const existingEmails = new Set(
      (await prisma.member.findMany({
        select: { email: true },
      })).map(m => m.email.toLowerCase())
    );
    console.log(`[Launch Preview] ${existingEmails.size} members already in CRM`);

    // Build preview
    const members: ImportMemberPreview[] = [];
    let alreadyInCRM = 0;
    let withOnboarding = 0;
    let withoutOnboarding = 0;

    for (const lsMember of lsMembers) {
      const emailLower = lsMember.email.toLowerCase();
      const inCRM = existingEmails.has(emailLower);

      if (inCRM) {
        alreadyInCRM++;
        members.push({
          email: lsMember.email,
          vorname: lsMember.firstName,
          nachname: lsMember.lastName,
          hasOnboarding: false,
          alreadyInCRM: true,
          action: 'skip',
        });
        continue;
      }

      // Check for onboarding match
      const nameKey = normalizeName(lsMember.firstName, lsMember.lastName);
      const hasOnboarding = onboardingIndex.has(nameKey);

      if (hasOnboarding) {
        withOnboarding++;
      } else {
        withoutOnboarding++;
      }

      members.push({
        email: lsMember.email,
        vorname: lsMember.firstName,
        nachname: lsMember.lastName,
        hasOnboarding,
        alreadyInCRM: false,
        action: hasOnboarding ? 'import_with_onboarding' : 'import_without_onboarding',
      });
    }

    const toImport = withOnboarding + withoutOnboarding;
    const estimatedMinutes = Math.ceil((toImport * DEFAULT_IMPORT_CONFIG.cooldownMs) / 60000);

    const preview: ImportPreview = {
      totalFromLS: lsMembers.length,
      alreadyInCRM,
      toImport,
      withOnboarding,
      withoutOnboarding,
      estimatedMinutes,
      members,
    };

    return NextResponse.json({
      success: true,
      preview,
      csvStats: {
        totalRows,
        validRows,
        errors: csvErrors.slice(0, 10), // Only first 10 errors
      },
    });
  } catch (error) {
    console.error('[Launch Preview] Error:', error);
    return NextResponse.json({
      error: 'Preview failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
