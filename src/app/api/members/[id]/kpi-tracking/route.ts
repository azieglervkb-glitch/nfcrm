import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp, isInQuietHours } from "@/lib/whatsapp";
import { generateFormUrl } from "@/lib/app-url";
import { randomBytes } from "crypto";

/**
 * PATCH /api/members/[id]/kpi-tracking
 * 
 * Activate or deactivate KPI tracking for a single member
 * 
 * Body: {
 *   enabled: boolean
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can manage KPI tracking
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        vorname: true,
        nachname: true,
        whatsappNummer: true,
        kpiTrackingEnabled: true,
        kpiSetupCompleted: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (enabled) {
      // Activate KPI tracking
      if (member.kpiTrackingEnabled) {
        return NextResponse.json({
          message: "KPI tracking is already enabled",
          member: { id: member.id, kpiTrackingEnabled: true },
        });
      }

      await prisma.member.update({
        where: { id },
        data: {
          kpiTrackingEnabled: true,
          kpiTrackingEnabledAt: new Date(),
        },
      });

      // Create KPI setup token
      const token = randomBytes(32).toString("hex");
      await prisma.formToken.create({
        data: {
          token,
          type: "kpi-setup",
          memberId: member.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      const kpiSetupUrl = generateFormUrl("kpi-setup", token);

      // Send KPI setup email
      await sendEmail({
        to: member.email,
        subject: "Starte dein persönliches KPI-Tracking",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ae1d2b 0%, #8a1722 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Starte dein KPI-Tracking! 📊</h1>
            </div>
            <div style="background: #ffffff; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="font-size: 18px; color: #111827;">Hey ${member.vorname}!</p>
              <p style="color: #6b7280; line-height: 1.6;">
                Es ist Zeit, dein persönliches KPI-Tracking einzurichten! 📈
              </p>
              <p style="color: #6b7280; line-height: 1.6;">
                Mit dem KPI-Tracking kannst du deine Fortschritte wöchentlich tracken und erhältst
                personalisiertes Feedback von deinem Coach.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${kpiSetupUrl}" style="background: #ae1d2b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  KPI-Tracking einrichten →
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 14px;">
                Der Link ist 7 Tage gültig.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 14px; text-align: center;">
                NF Mentoring | <a href="https://nf-mentoring.de" style="color: #ae1d2b;">nf-mentoring.de</a>
              </p>
            </div>
          </div>
        `,
      }).catch((error) => {
        console.error(`Failed to send KPI setup email:`, error);
      });

      // Send WhatsApp if available and not in quiet hours
      if (member.whatsappNummer) {
        const quietHours = await isInQuietHours();
        if (!quietHours) {
          await sendWhatsApp({
            phone: member.whatsappNummer,
            message: `Hey ${member.vorname}! 📊 Es ist Zeit, dein KPI-Tracking einzurichten. Hier geht's zum Setup: ${kpiSetupUrl}`,
            memberId: member.id,
            type: "REMINDER",
            ruleId: "MANUAL_KPI_ACTIVATION",
          }).catch((error) => {
            console.error(`Failed to send KPI setup WhatsApp:`, error);
          });
        }
      }

      // Update timestamps
      await prisma.member.update({
        where: { id },
        data: {
          kpiSetupSentAt: new Date(),
        },
      });

      // Log automation
      await prisma.automationLog.create({
        data: {
          memberId: member.id,
          ruleId: "MANUAL",
          ruleName: "KPI Tracking Activated",
          actionsTaken: [
            "ACTIVATE_KPI_TRACKING",
            "CREATE_KPI_SETUP_TOKEN",
            "SEND_KPI_SETUP_EMAIL",
            member.whatsappNummer ? "SEND_KPI_SETUP_WHATSAPP" : "SKIP_WHATSAPP",
          ],
          details: {
            activatedBy: session.user.id,
            kpiSetupUrl,
          },
        },
      }).catch((error) => {
        console.error("Failed to create automation log:", error);
      });

      return NextResponse.json({
        success: true,
        message: "KPI tracking activated and setup email sent",
        member: {
          id: member.id,
          kpiTrackingEnabled: true,
          kpiTrackingEnabledAt: new Date(),
        },
      });
    } else {
      // Deactivate KPI tracking
      await prisma.member.update({
        where: { id },
        data: {
          kpiTrackingEnabled: false,
          kpiTrackingEnabledAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "KPI tracking deactivated",
        member: {
          id: member.id,
          kpiTrackingEnabled: false,
        },
      });
    }
  } catch (error) {
    console.error("Error updating KPI tracking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

