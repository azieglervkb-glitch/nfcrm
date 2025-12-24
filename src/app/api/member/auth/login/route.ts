import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "member-portal-secret-key"
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, accessCode } = body;

    if (!email || !accessCode) {
      return NextResponse.json(
        { message: "Email and access code are required" },
        { status: 400 }
      );
    }

    // Find member by email
    const member = await prisma.member.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!member) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check access code (stored in notes or a dedicated field)
    // For now, we'll use a simple check - the access code should be the last 6 chars of member ID
    const expectedCode = member.id.slice(-6).toUpperCase();
    if (accessCode.toUpperCase() !== expectedCode) {
      return NextResponse.json(
        { message: "Invalid access code" },
        { status: 401 }
      );
    }

    // Check if member is active
    if (member.status === "CHURNED") {
      return NextResponse.json(
        { message: "Your membership is no longer active" },
        { status: 403 }
      );
    }

    // Create JWT token
    const token = await new SignJWT({
      memberId: member.id,
      email: member.email,
      firstName: member.firstName,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("member_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
      },
    });
  } catch (error) {
    console.error("Member login error:", error);
    return NextResponse.json(
      { message: "Login failed" },
      { status: 500 }
    );
  }
}
