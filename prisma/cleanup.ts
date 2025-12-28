import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanup() {
  console.log("🧹 Starting cleanup...\n");

  // SAFETY: Ask for confirmation
  const args = process.argv.slice(2);
  if (!args.includes("--confirm")) {
    console.log("⚠️  WARNING: This will delete ALL members, KPIs, tasks, and related data!");
    console.log("⚠️  Admin users will be kept.");
    console.log("\nTo confirm, run: npx tsx prisma/cleanup.ts --confirm\n");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log("🗑️  Deleting data in order...\n");

  // 1. Delete all KPI weeks
  const kpiWeeks = await prisma.kpiWeek.deleteMany({});
  console.log(`   ✅ Deleted ${kpiWeeks.count} KPI weeks`);

  // 2. Delete all automation cooldowns
  const cooldowns = await prisma.automationCooldown.deleteMany({});
  console.log(`   ✅ Deleted ${cooldowns.count} automation cooldowns`);

  // 3. Delete all automation logs
  const logs = await prisma.automationLog.deleteMany({});
  console.log(`   ✅ Deleted ${logs.count} automation logs`);

  // 4. Delete all form tokens
  const tokens = await prisma.formToken.deleteMany({});
  console.log(`   ✅ Deleted ${tokens.count} form tokens`);

  // 5. Delete all member notes
  const notes = await prisma.memberNote.deleteMany({});
  console.log(`   ✅ Deleted ${notes.count} member notes`);

  // 6. Delete all tasks
  const tasks = await prisma.task.deleteMany({});
  console.log(`   ✅ Deleted ${tasks.count} tasks`);

  // 7. Delete all upsell pipelines
  const upsells = await prisma.upsellPipeline.deleteMany({});
  console.log(`   ✅ Deleted ${upsells.count} upsell pipeline entries`);

  // 8. Delete all communication logs
  const comms = await prisma.communicationLog.deleteMany({});
  console.log(`   ✅ Deleted ${comms.count} communication logs`);

  // 9. Delete all member sessions
  const sessions = await prisma.memberSession.deleteMany({});
  console.log(`   ✅ Deleted ${sessions.count} member sessions`);

  // 11. Delete all members
  const members = await prisma.member.deleteMany({});
  console.log(`   ✅ Deleted ${members.count} members`);

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Cleanup completed!");
  console.log("\n📋 Admin users were kept.");
  console.log("💡 Run 'npx prisma db seed' to re-create test data.");
  console.log("=".repeat(60) + "\n");
}

cleanup()
  .catch((e) => {
    console.error("❌ Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
