import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Update AI feedback and/or scheduled send time (only before sending)
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
    const body = await request.json();
    const { feedback, scheduledFor } = body;

    // Get the KPI week
    const kpiWeek = await prisma.kpiWeek.findUnique({
      where: { id },
      select: {
        id: true,
        whatsappFeedbackSent: true,
        aiFeedbackText: true,
        whatsappScheduledFor: true,
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

    // Prepare update data
    const updateData: {
      aiFeedbackText?: string;
      aiFeedbackGeneratedAt?: Date;
      whatsappScheduledFor?: Date | null;
    } = {};

    // Update feedback text if provided
    if (feedback !== undefined) {
      if (typeof feedback !== "string" || !feedback.trim()) {
        return NextResponse.json(
          { error: "Feedback text is required" },
          { status: 400 }
        );
      }
      updateData.aiFeedbackText = feedback.trim();
      updateData.aiFeedbackGeneratedAt = new Date();
    }

    // Update scheduled time if provided
    if (scheduledFor !== undefined) {
      if (scheduledFor === null) {
        // Allow clearing the schedule
        updateData.whatsappScheduledFor = null;
      } else {
        const scheduledDate = new Date(scheduledFor);
        if (isNaN(scheduledDate.getTime())) {
          return NextResponse.json(
            { error: "Invalid date format for scheduledFor" },
            { status: 400 }
          );
        }
        updateData.whatsappScheduledFor = scheduledDate;
      }
    }

    // Nothing to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update the KPI week
    const updated = await prisma.kpiWeek.update({
      where: { id },
      data: updateData,
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
