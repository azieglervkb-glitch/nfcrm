import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncMemberWithLearninSuite } from "@/lib/learningsuite";

/**
 * POST /api/members/[id]/sync-learningsuite
 * Manually sync a member's LearningSuite progress
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Get member
    const member = await prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        vorname: true,
        nachname: true,
        learningSuiteUserId: true,
        currentModule: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (!member.email) {
      return NextResponse.json(
        { error: "Member has no email address" },
        { status: 400 }
      );
    }

    // Sync with LearningSuite
    const syncResult = await syncMemberWithLearninSuite(member.email);

    if (!syncResult.synced) {
      return NextResponse.json({
        success: false,
        message: "Member not found in LearningSuite",
        email: member.email,
      });
    }

    // Update member with synced data
    const updatedMember = await prisma.member.update({
      where: { id },
      data: {
        learningSuiteUserId: syncResult.learningSuiteUserId || member.learningSuiteUserId,
        currentModule: syncResult.currentModule,
        learningSuiteLastSync: new Date(),
      },
      select: {
        id: true,
        learningSuiteUserId: true,
        currentModule: true,
        learningSuiteLastSync: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "LearningSuite sync completed",
      data: {
        memberId: member.id,
        memberName: `${member.vorname} ${member.nachname}`,
        email: member.email,
        learningSuiteUserId: updatedMember.learningSuiteUserId,
        currentModule: updatedMember.currentModule,
        lastSync: updatedMember.learningSuiteLastSync,
        courses: syncResult.courses,
      },
    });
  } catch (error) {
    console.error("LearningSuite manual sync error:", error);
    return NextResponse.json(
      {
        error: "Sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
