/**
 * Launch Status API
 * GET: Get current import status (for polling)
 * POST: Control import (pause/resume/reset)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getImportStatus, pauseImport, resetImportStatus } from '@/lib/launch/import-engine';

export async function GET() {
  // Auth check - only SUPER_ADMIN
  const session = await auth();
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = getImportStatus();
  return NextResponse.json({ status });
}

export async function POST(request: NextRequest) {
  // Auth check - only SUPER_ADMIN
  const session = await auth();
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action } = await request.json();

    switch (action) {
      case 'pause':
        pauseImport();
        return NextResponse.json({
          success: true,
          message: 'Import paused',
          status: getImportStatus(),
        });

      case 'reset':
        resetImportStatus();
        return NextResponse.json({
          success: true,
          message: 'Import reset',
          status: getImportStatus(),
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Launch Status] Error:', error);
    return NextResponse.json({
      error: 'Action failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
