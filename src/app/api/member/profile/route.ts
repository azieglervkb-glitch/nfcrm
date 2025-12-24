import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await prisma.member.findUnique({
      where: { id: session.memberId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        onboardingDate: true,
        program: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      status: member.status,
      onboardingDate: member.onboardingDate?.toISOString() || null,
      program: member.program,
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email ? email.toLowerCase() : undefined,
        phone: phone || undefined,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        onboardingDate: true,
        program: true,
      },
    });

    return NextResponse.json({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      status: member.status,
      onboardingDate: member.onboardingDate?.toISOString() || null,
      program: member.program,
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
