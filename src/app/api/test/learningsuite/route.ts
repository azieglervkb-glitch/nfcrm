import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserProgressByEmail, syncMemberWithLearninSuite } from "@/lib/learningsuite";

/**
 * Test endpoint for LearninSuite API
 * GET /api/test/learningsuite?email=test@example.com
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "email parameter required" },
        { status: 400 }
      );
    }

    // Test 1: Get user progress by email
    console.log(`Testing LearninSuite API for email: ${email}`);
    const userProgress = await getUserProgressByEmail(email);

    if (!userProgress) {
      return NextResponse.json({
        success: false,
        message: "User not found in LearninSuite",
        email,
        test: "getUserProgressByEmail",
      });
    }

    // Test 2: Sync member data
    const syncResult = await syncMemberWithLearninSuite(email);

    return NextResponse.json({
      success: true,
      message: "LearninSuite API test successful",
      email,
      userProgress: {
        id: userProgress.id,
        email: userProgress.email,
        firstName: userProgress.firstName,
        lastName: userProgress.lastName,
        currentModule: userProgress.currentModule,
        completedModules: userProgress.completedModules,
        progress: userProgress.progress,
      },
      syncResult,
      apiKeyConfigured: !!process.env.LEARNINSUITE_API_KEY,
    });
  } catch (error) {
    console.error("LearninSuite API test error:", error);
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

