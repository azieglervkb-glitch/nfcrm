import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { message: "Member ID erforderlich" },
        { status: 400 }
      );
    }

    // Find the member
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        email: true,
        vorname: true,
        nachname: true,
        status: true,
        kpiTrackingEnabled: true,
        kpiSetupCompleted: true,
        kpiTrackingActive: true, // Legacy field
        hauptzielEinSatz: true, // Required field from KPI setup
        onboardingCompleted: true,
        zielMonatsumsatz: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { message: "Mitglied nicht gefunden" },
        { status: 404 }
      );
    }

    // Check if member is active
    if (member.status === "GEKUENDIGT") {
      return NextResponse.json(
        { message: "Dein Zugang ist nicht mehr aktiv" },
        { status: 403 }
      );
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Store session in database
    await prisma.memberSession.upsert({
      where: { memberId: member.id },
      update: {
        token: sessionToken,
        expiresAt,
      },
      create: {
        memberId: member.id,
        token: sessionToken,
        expiresAt,
      },
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("member_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    // Determine if KPI setup is completed using multiple indicators
    // This handles legacy members who completed setup before kpiSetupCompleted was added
    const hasCompletedKpiSetup =
      member.kpiSetupCompleted === true ||
      member.kpiTrackingEnabled === true ||
      member.kpiTrackingActive === true ||
      (member.hauptzielEinSatz !== null && member.hauptzielEinSatz.length > 0);

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        firstName: member.vorname,
        lastName: member.nachname,
        kpiTrackingEnabled: member.kpiTrackingEnabled,
        kpiSetupCompleted: hasCompletedKpiSetup, // Use computed value
        onboardingCompleted: member.onboardingCompleted,
        zielMonatsumsatz: member.zielMonatsumsatz ? Number(member.zielMonatsumsatz) : null,
      },
    });
  } catch (error) {
    console.error("Direct login error:", error);
    return NextResponse.json(
      { message: "Fehler beim Anmelden" },
      { status: 500 }
    );
  }
}
