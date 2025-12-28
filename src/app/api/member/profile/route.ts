import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Support direct memberId parameter or session-based auth
    const { searchParams } = new URL(request.url);
    const directMemberId = searchParams.get("memberId");

    let memberId: string;

    if (directMemberId) {
      memberId = directMemberId;
    } else {
      const session = await getMemberSession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      memberId = session.memberId;
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        vorname: true,
        nachname: true,
        email: true,
        telefon: true,
        status: true,
        produkte: true,
        membershipStart: true,
        onboardingCompleted: true,
        kpiTrackingEnabled: true,
        kpiSetupCompleted: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: member.id,
      vorname: member.vorname,
      nachname: member.nachname,
      email: member.email,
      telefon: member.telefon,
      status: member.status,
      produkte: member.produkte,
      membershipStart: member.membershipStart.toISOString(),
      onboardingCompleted: member.onboardingCompleted,
      kpiTrackingEnabled: member.kpiTrackingEnabled,
      kpiSetupCompleted: member.kpiSetupCompleted,
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, email, phone } = body;

    // Check if email is already taken by another member
    if (email && email !== session.email) {
      const existingMember = await prisma.member.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingMember && existingMember.id !== session.memberId) {
        return NextResponse.json(
          { message: "Email is already in use" },
          { status: 400 }
        );
      }
    }

    const member = await prisma.member.update({
      where: { id: session.memberId },
      data: {
        vorname: firstName || undefined,
        nachname: lastName || undefined,
        email: email ? email.toLowerCase() : undefined,
        telefon: phone || undefined,
      },
      select: {
        id: true,
        vorname: true,
        nachname: true,
        email: true,
        telefon: true,
        status: true,
        produkte: true,
        membershipStart: true,
        onboardingCompleted: true,
        kpiTrackingEnabled: true,
        kpiSetupCompleted: true,
      },
    });

    return NextResponse.json({
      id: member.id,
      vorname: member.vorname,
      nachname: member.nachname,
      email: member.email,
      telefon: member.telefon,
      status: member.status,
      produkte: member.produkte,
      membershipStart: member.membershipStart.toISOString(),
      onboardingCompleted: member.onboardingCompleted,
      kpiTrackingEnabled: member.kpiTrackingEnabled,
      kpiSetupCompleted: member.kpiSetupCompleted,
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
