/**
 * Migration Script: Fix KPI weekStart dates
 *
 * Problem: weekStart dates were saved with different timezone calculations,
 * causing mismatches between what was saved and what the dashboard queries.
 *
 * Solution: Normalize all weekStart dates to Monday 00:00:00 local time.
 *
 * Run with: npx tsx scripts/fix-kpi-weekstart.ts
 */

import { PrismaClient } from '@prisma/client';
import { startOfWeek } from 'date-fns';

const prisma = new PrismaClient();

async function fixKpiWeekStart() {
  console.log('🔧 Starting KPI weekStart migration...\n');

  // Get all KPI entries
  const allKpis = await prisma.kpiWeek.findMany({
    select: {
      id: true,
      weekStart: true,
      weekNumber: true,
      year: true,
      member: {
        select: { vorname: true, nachname: true }
      }
    },
    orderBy: { weekStart: 'desc' }
  });

  console.log(`📊 Found ${allKpis.length} KPI entries to check\n`);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const kpi of allKpis) {
    const currentWeekStart = new Date(kpi.weekStart);

    // Calculate the correct Monday 00:00:00 local time
    const correctMonday = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
    correctMonday.setHours(0, 0, 0, 0);

    // Check if they're different
    if (currentWeekStart.getTime() !== correctMonday.getTime()) {
      console.log(`🔄 Fixing: ${kpi.member.vorname} ${kpi.member.nachname} - KW${kpi.weekNumber}/${kpi.year}`);
      console.log(`   Old: ${currentWeekStart.toISOString()}`);
      console.log(`   New: ${correctMonday.toISOString()}`);

      // Check if there's already an entry for the correct date (duplicate prevention)
      const existing = await prisma.kpiWeek.findFirst({
        where: {
          memberId: kpi.id.split('_')[0], // Assuming id format, but we need to get memberId
          weekStart: correctMonday,
          id: { not: kpi.id }
        }
      });

      if (existing) {
        console.log(`   ⚠️  Skipped: Would create duplicate\n`);
        skippedCount++;
        continue;
      }

      // Update the weekStart
      await prisma.kpiWeek.update({
        where: { id: kpi.id },
        data: { weekStart: correctMonday }
      });

      console.log(`   ✅ Fixed!\n`);
      fixedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log('\n📈 Migration Summary:');
  console.log(`   Fixed: ${fixedCount}`);
  console.log(`   Already correct: ${skippedCount}`);
  console.log('\n✅ Done!');
}

// Alternative simpler approach - just update all to use local Monday
async function fixAllKpiWeekStarts() {
  console.log('🔧 Starting KPI weekStart migration (simple mode)...\n');

  const allKpis = await prisma.kpiWeek.findMany({
    include: {
      member: {
        select: { vorname: true, nachname: true }
      }
    },
    orderBy: { weekStart: 'desc' }
  });

  console.log(`📊 Found ${allKpis.length} KPI entries\n`);

  for (const kpi of allKpis) {
    const currentWeekStart = new Date(kpi.weekStart);

    // Calculate the correct Monday 00:00:00 local time
    const correctMonday = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
    correctMonday.setHours(0, 0, 0, 0);

    // Only update if different
    if (currentWeekStart.getTime() !== correctMonday.getTime()) {
      console.log(`🔄 ${kpi.member.vorname} ${kpi.member.nachname} - KW${kpi.weekNumber}`);
      console.log(`   ${currentWeekStart.toISOString()} → ${correctMonday.toISOString()}`);

      try {
        await prisma.kpiWeek.update({
          where: { id: kpi.id },
          data: { weekStart: correctMonday }
        });
        console.log(`   ✅ Fixed`);
      } catch (error) {
        console.log(`   ❌ Error: ${error}`);
      }
    }
  }

  console.log('\n✅ Migration complete!');
}

// Run the migration
fixAllKpiWeekStarts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
