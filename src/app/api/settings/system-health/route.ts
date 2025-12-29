import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get latest system health check result
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for admin access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get latest health check log
    const latestHealthCheck = await prisma.automationLog.findFirst({
      where: { ruleId: "SYSTEM_HEALTH" },
      orderBy: { firedAt: "desc" },
    });

    if (!latestHealthCheck) {
      return NextResponse.json({
        status: "UNKNOWN",
        message: "Noch kein Health-Check durchgeführt",
        lastCheck: null,
        data: null,
      });
    }

    const details = latestHealthCheck.details as {
      status?: string;
      summary?: string;
      data?: unknown;
      issues?: string[];
    } | null;

    return NextResponse.json({
      status: details?.status || (latestHealthCheck.triggered ? "OK" : "ERROR"),
      summary: details?.summary || "Keine Details verfügbar",
      issues: details?.issues || [],
      lastCheck: latestHealthCheck.firedAt,
      triggered: latestHealthCheck.triggered,
      data: details?.data,
    });
  } catch (error) {
    console.error("Failed to get health status:", error);
    return NextResponse.json(
      { error: "Failed to get health status" },
      { status: 500 }
    );
  }
}

// Trigger manual health check
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for admin access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Call the health check endpoint internally with force=true to bypass schedule check
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const cronSecret = process.env.CRON_SECRET || "";

    const response = await fetch(`${baseUrl}/api/cron/system-health?force=true`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const result = await response.json();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Manual health check failed:", error);
    return NextResponse.json(
      { error: "Health check failed", details: String(error) },
      { status: 500 }
    );
  }
}
