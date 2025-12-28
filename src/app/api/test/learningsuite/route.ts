import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getMemberProgressByEmail,
  syncMemberWithLearninSuite,
  testApiConnection,
} from "@/lib/learningsuite";

/**
 * Test endpoint for LearningSuite API
 * GET /api/test/learningsuite?email=test@example.com
 *
 * Tests:
 * 1. API connectivity
 * 2. Member lookup by email
 * 3. Course progress retrieval
 * 4. Module calculation
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    // Test 1: Check API configuration and connectivity
    const connectionTest = await testApiConnection();

    if (!connectionTest.configured) {
      return NextResponse.json({
        success: false,
        message: "LearningSuite API not configured",
        apiKeyConfigured: false,
        hint: "Set LEARNINGSUITE_API_KEY in environment variables",
      });
    }

    if (!connectionTest.connected) {
      return NextResponse.json({
        success: false,
        message: "LearningSuite API connection failed",
        apiKeyConfigured: true,
        connected: false,
        error: connectionTest.error,
        hint: "Check if API key is valid and has correct permissions",
        debug: {
          apiKeyPrefix: process.env.LEARNINGSUITE_API_KEY?.substring(0, 8) + "...",
        },
      });
    }

    // If no email provided, just return connection status
    if (!email) {
      return NextResponse.json({
        success: true,
        message: "LearningSuite API connection successful",
        apiKeyConfigured: true,
        connected: true,
        hint: "Add ?email=user@example.com to test member lookup",
      });
    }

    // Test 2: Get member progress by email
    console.log(`Testing LearningSuite API for email: ${email}`);
    const memberProgress = await getMemberProgressByEmail(email);

    if (!memberProgress) {
      return NextResponse.json({
        success: false,
        message: "Member not found in LearningSuite",
        email,
        apiKeyConfigured: true,
        connected: true,
        memberFound: false,
        hint: "Verify the email address exists in LearningSuite",
      });
    }

    // Test 3: Full sync simulation
    const syncResult = await syncMemberWithLearninSuite(email);

    return NextResponse.json({
      success: true,
      message: "LearningSuite API test successful",
      email,
      apiKeyConfigured: true,
      connected: true,
      memberFound: true,
      memberProgress: {
        memberId: memberProgress.memberId,
        email: memberProgress.email,
        firstName: memberProgress.firstName,
        lastName: memberProgress.lastName,
        currentModule: memberProgress.currentModule,
        totalProgress: memberProgress.totalProgress,
        coursesCount: memberProgress.courses.length,
        courses: memberProgress.courses.map((course) => ({
          id: course.id,
          title: course.title,
          progress: course.progress,
          completedLessons: course.completedLessons,
          totalLessons: course.totalLessons,
          isCompleted: course.isCompleted,
          lastActivity: course.lastActivityAt,
        })),
      },
      syncResult: {
        learningSuiteUserId: syncResult.learningSuiteUserId,
        currentModule: syncResult.currentModule,
        synced: syncResult.synced,
      },
    });
  } catch (error) {
    console.error("LearningSuite API test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
