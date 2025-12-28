import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Get 2FA status for current user
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      enabled: user.twoFactorEnabled,
    });
  } catch (error) {
    console.error("Error getting 2FA status:", error);
    return NextResponse.json(
      { error: "Fehler beim Abrufen des 2FA-Status" },
      { status: 500 }
    );
  }
}

