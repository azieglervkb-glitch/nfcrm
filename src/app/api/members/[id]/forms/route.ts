import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const member = await prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        vorname: true,
        nachname: true,
        email: true,
        status: true,
        onboardingCompleted: true,
        onboardingDate: true,
        kpiTrackingActive: true,
        kpiTrackingStartDate: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Form URLs use member ID directly
    const baseUrl = process.env.APP_URL || "http://localhost:3000";

    return NextResponse.json({
      ...member,
      forms: {
        onboarding: {
          url: `${baseUrl}/form/onboarding/${member.id}`,
          completed: member.onboardingCompleted,
          completedAt: member.onboardingDate,
        },
        kpiSetup: {
          url: `${baseUrl}/form/kpi-setup/${member.id}`,
          completed: member.kpiTrackingActive,
          completedAt: member.kpiTrackingStartDate,
        },
        weekly: {
          url: `${baseUrl}/form/weekly/${member.id}`,
          description: "Wöchentliches KPI-Formular",
        },
      },
    });
  } catch (error) {
    console.error("Failed to get form info:", error);
    return NextResponse.json(
      { error: "Failed to get form info" },
      { status: 500 }
    );
  }
}
