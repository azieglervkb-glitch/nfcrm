import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authenticator } from "otplib";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");

function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = Buffer.from(parts[1], "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
      iv
    );
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt 2FA secret");
  }
}

/**
 * Verify 2FA code and enable 2FA
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Code erforderlich" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA nicht eingerichtet. Bitte zuerst Setup durchführen." },
        { status: 400 }
      );
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "2FA bereits aktiviert" },
        { status: 400 }
      );
    }

    // Decrypt and verify code
    const decryptedSecret = decrypt(user.twoFactorSecret);
    const isValid = authenticator.verify({
      token: code,
      secret: decryptedSecret,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Ungültiger Code" },
        { status: 401 }
      );
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "2FA erfolgreich aktiviert",
    });
  } catch (error) {
    console.error("Error verifying 2FA setup:", error);
    return NextResponse.json(
      { error: "Fehler beim Verifizieren des Codes" },
      { status: 500 }
    );
  }
}

