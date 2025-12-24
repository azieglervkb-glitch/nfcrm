import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface MemberSession {
  memberId: string;
  email: string;
  firstName: string;
}

export async function getMemberSession(): Promise<MemberSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("member_token");

    if (!token) {
      return null;
    }

    // Look up session in database
    const session = await prisma.memberSession.findUnique({
      where: { token: token.value },
      include: {
        member: {
          select: {
            id: true,
            email: true,
            vorname: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await prisma.memberSession.delete({ where: { id: session.id } });
      return null;
    }

    return {
      memberId: session.member.id,
      email: session.member.email,
      firstName: session.member.vorname,
    };
  } catch (error) {
    console.error("Failed to get member session:", error);
    return null;
  }
}

export async function getMemberFromId(memberId: string) {
  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        email: true,
        vorname: true,
        nachname: true,
        status: true,
      },
    });

    if (!member || member.status === "GEKUENDIGT") {
      return null;
    }

    return member;
  } catch (error) {
    console.error("Failed to get member:", error);
    return null;
  }
}
