import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Update AI feedback manually (only before sending)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for admin/coach access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["SUPER_ADMIN", "ADMIN", "COACH"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;
    const { feedback } = await request.json();

    if (!feedback || typeof feedback !== "string") {
      return NextResponse.json(
        { error: "Feedback text is required" },
        { status: 400 }
      );
    }

    // Get the KPI week
    const kpiWeek = await prisma.kpiWeek.findUnique({
      where: { id },
      select: {
        id: true,
        whatsappFeedbackSent: true,
        aiFeedbackText: true,
      },
    });

    if (!kpiWeek) {
      return NextResponse.json({ error: "KPI week not found" }, { status: 404 });
    }

    // Only allow editing if not already sent
    if (kpiWeek.whatsappFeedbackSent) {
      return NextResponse.json(
        { error: "Feedback wurde bereits gesendet und kann nicht mehr bearbeitet werden" },
        { status: 400 }
      );
    }

    // Update the feedback
    const updated = await prisma.kpiWeek.update({
      where: { id },
      data: {
        aiFeedbackText: feedback.trim(),
        // Mark that it was manually edited
        aiFeedbackGeneratedAt: new Date(), // Update timestamp to show it was modified
      },
      select: {
        id: true,
        aiFeedbackText: true,
        aiFeedbackGeneratedAt: true,
        whatsappScheduledFor: true,
        whatsappFeedbackSent: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Feedback wurde aktualisiert",
      kpiWeek: updated,
    });
  } catch (error) {
    console.error("Error updating feedback:", error);
    return NextResponse.json(
      { error: "Failed to update feedback" },
      { status: 500 }
    );
  }
}
