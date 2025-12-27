import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Check if user has 2FA enabled (called after password validation)
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email und Passwort erforderlich" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
        twoFactorEnabled: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Ungültige Anmeldedaten" },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Ungültige Anmeldedaten" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      requires2FA: user.twoFactorEnabled,
      email: user.twoFactorEnabled ? email : undefined,
    });
  } catch (error) {
    console.error("Error checking 2FA:", error);
    return NextResponse.json(
      { error: "Fehler beim Prüfen der 2FA" },
      { status: 500 }
    );
  }
}

