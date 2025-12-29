import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

// Schema for system settings validation
const systemSettingsSchema = z.object({
  // Quiet Hours
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.number().min(0).max(23).optional(),
  quietHoursEnd: z.number().min(0).max(23).optional(),

  // KPI Reminder Schedule
  kpiReminderEnabled: z.boolean().optional(),
  kpiReminderDay1: z.number().min(0).max(6).optional(), // 0 = Sunday
  kpiReminderTime1: z.string().optional(),
  kpiReminderDay2: z.number().min(0).max(6).optional(),
  kpiReminderTime2: z.string().optional(),
  kpiReminderChannels: z.array(z.enum(["EMAIL", "WHATSAPP"])).optional(),

  // AI Feedback Settings
  aiFeedbackEnabled: z.boolean().optional(),
  aiFeedbackDelay: z.number().min(0).optional(), // deprecated
  aiFeedbackDelayMin: z.number().min(0).max(1440).optional(),
  aiFeedbackDelayMax: z.number().min(0).max(1440).optional(),
  aiFeedbackChannels: z.array(z.enum(["EMAIL", "WHATSAPP"])).optional(),

  // Scheduled Automations
  automationsEnabled: z.boolean().optional(),
  automationsDay: z.number().min(0).max(6).optional(),
  automationsTime: z.string().optional(),

  // Inactivity Thresholds
  churnRiskWeeks: z.number().min(1).max(12).optional(),
  dangerZoneWeeks: z.number().min(1).max(24).optional(),

  // Upsell Triggers
  upsellRevenueThreshold: z.coerce.number().min(0).optional(),
  upsellConsecutiveWeeks: z.coerce.number().min(1).max(52).optional(), // Automation requires min 4 to work

  // Notifications
  coachEmailNotifications: z.boolean().optional(),
  adminEmailDigest: z.boolean().optional(),
  adminEmailDigestTime: z.string().optional(),

  // KPI Tracking Trigger Settings
  kpiTriggerModule: z.number().min(1).max(10).optional(),
  kpiTriggerSource: z.enum(["manual", "learningsuite_api", "both"]).optional(),
  kpiSetupReminderDays: z.array(z.number().min(0).max(30)).optional(),
  onboardingReminderDays: z.array(z.number().min(0).max(30)).optional(),

  // Onboarding Trigger Settings (LearningSuite-based)
  onboardingTriggerEnabled: z.boolean().optional(),
  onboardingTriggerLessonId: z.string().nullable().optional(),
  onboardingTriggerLessonName: z.string().nullable().optional(),
  onboardingTriggerCourseId: z.string().nullable().optional(),
  onboardingExistingMemberModule: z.number().min(1).max(10).optional(),
});

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get or create default settings
    let settings = await prisma.systemSettings.findFirst({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: "default" },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can update settings
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validatedData = systemSettingsSchema.parse(body);

    // Upsert settings
    const settings = await prisma.systemSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...validatedData,
      },
      update: validatedData,
    });

    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
