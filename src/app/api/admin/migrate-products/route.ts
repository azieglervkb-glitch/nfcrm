import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductType } from "@prisma/client";

/**
 * POST /api/admin/migrate-products
 * Migrate all PREMIUM products to MM (Mastermind)
 * Only accessible by SUPER_ADMIN
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden - Super Admin required" }, { status: 403 });
    }

    // Find all members with PREMIUM in their products
    const membersWithPremium = await prisma.member.findMany({
      where: {
        produkte: {
          has: "PREMIUM",
        },
      },
      select: {
        id: true,
        vorname: true,
        nachname: true,
        produkte: true,
      },
    });

    console.log(`Found ${membersWithPremium.length} members with PREMIUM product`);

    let migratedCount = 0;
    const errors: string[] = [];

    // Update each member
    for (const member of membersWithPremium) {
      try {
        // Replace PREMIUM with MM
        const newProdukte = member.produkte.map((p) =>
          p === "PREMIUM" ? ProductType.MM : p
        ) as ProductType[];

        await prisma.member.update({
          where: { id: member.id },
          data: { produkte: newProdukte },
        });

        migratedCount++;
        console.log(`Migrated: ${member.vorname} ${member.nachname}`);
      } catch (error) {
        const errorMsg = `Failed to migrate ${member.vorname} ${member.nachname}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Also check leads (using interessiertAn field)
    const leadsWithPremium = await prisma.lead.findMany({
      where: {
        interessiertAn: "PREMIUM",
      },
      select: {
        id: true,
        vorname: true,
        nachname: true,
      },
    });

    let leadsUpdated = 0;
    for (const lead of leadsWithPremium) {
      try {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { interessiertAn: "MM" },
        });
        leadsUpdated++;
      } catch (error) {
        errors.push(`Failed to migrate lead ${lead.vorname} ${lead.nachname}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Migration completed",
      results: {
        membersFound: membersWithPremium.length,
        membersMigrated: migratedCount,
        leadsFound: leadsWithPremium.length,
        leadsMigrated: leadsUpdated,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/migrate-products
 * Check how many members/leads still have PREMIUM
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const membersWithPremium = await prisma.member.count({
      where: {
        produkte: {
          has: "PREMIUM",
        },
      },
    });

    const leadsWithPremium = await prisma.lead.count({
      where: {
        interessiertAn: "PREMIUM",
      },
    });

    return NextResponse.json({
      membersWithPremium,
      leadsWithPremium,
      needsMigration: membersWithPremium > 0 || leadsWithPremium > 0,
    });
  } catch (error) {
    console.error("Check error:", error);
    return NextResponse.json(
      { error: "Check failed" },
      { status: 500 }
    );
  }
}
