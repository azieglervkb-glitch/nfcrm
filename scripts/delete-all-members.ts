import { prisma } from "../src/lib/prisma";

async function deleteAllMembers() {
  console.log("Lösche alle Member und zugehörige Daten...\n");

  // Delete related records first (foreign keys)
  const kpiWeeks = await prisma.kpiWeek.deleteMany({});
  console.log(`Gelöscht: ${kpiWeeks.count} KPI-Wochen`);

  const notes = await prisma.memberNote.deleteMany({});
  console.log(`Gelöscht: ${notes.count} Notizen`);

  const goals = await prisma.goal.deleteMany({});
  console.log(`Gelöscht: ${goals.count} Ziele`);

  const members = await prisma.member.deleteMany({});
  console.log(`Gelöscht: ${members.count} Member`);

  console.log("\n✓ Alle Member erfolgreich gelöscht!");

  await prisma.$disconnect();
}

deleteAllMembers().catch(e => {
  console.error(e);
  process.exit(1);
});
