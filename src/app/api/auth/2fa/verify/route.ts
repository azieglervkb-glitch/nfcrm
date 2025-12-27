import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticator } from "otplib";
import { decryptTotpSecret } from "@/lib/twofa";

// Verify 2FA code during login
// This is called after successful password authentication
export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email und Code erforderlich" },
        { status: 400 }
      );
    }

    if (typeof code !== "string" || code.length !== 6) {
      return NextResponse.json(
        { error: "Ungültiger Code. Bitte 6-stelligen Code eingeben." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA nicht aktiviert für diesen Benutzer" },
        { status: 400 }
      );
    }

    // Verify the code
    const isValid = authenticator.verify({
      token: code,
      secret: decryptTotpSecret(user.twoFactorSecret),
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Ungültiger Code. Bitte erneut versuchen." },
        { status: 400 }
      );
    }

    // Set a temporary cookie to indicate 2FA was verified
    // This will be checked by the credentials provider
    const response = NextResponse.json({
      success: true,
      message: "2FA verifiziert",
    });

    response.cookies.set("2fa-verified", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60, // 1 minute - just long enough to complete sign in
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error verifying 2FA during login:", error);
    return NextResponse.json(
      { error: "Fehler bei der 2FA-Verifizierung" },
      { status: 500 }
    );
  }
}

