import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "member-portal-secret-key"
);

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("member_token");

    if (!token) {
      return NextResponse.json({ error: "No token" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token.value, JWT_SECRET);
    const memberId = payload.memberId as string;

    // Verify member still exists and is active
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
      },
    });

    if (!member || member.status === "CHURNED") {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    return NextResponse.json({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      status: member.status,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
