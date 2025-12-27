import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import { encryptTotpSecret } from "@/lib/twofa";

// Generate 2FA secret and QR code for setup
export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "2FA is already enabled" },
        { status: 400 }
      );
    }

    // Generate secret
    const secret = authenticator.generateSecret();

    // Store secret temporarily (not enabled yet until verified)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { twoFactorSecret: encryptTotpSecret(secret) },
    });

    // Generate QR code
    const otpauth = authenticator.keyuri(
      user.email,
      "NF CRM",
      secret
    );

    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
    });
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    return NextResponse.json(
      { error: "Failed to set up 2FA" },
      { status: 500 }
    );
  }
}

