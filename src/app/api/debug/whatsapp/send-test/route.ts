import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp";

/**
 * Admin-only manual WhatsApp send test.
 *
 * Query params:
 * - phone: string (optional)
 * - memberId: string (optional, used to look up phone)
 * - message: string (optional)
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const phoneParam = searchParams.get("phone") || undefined;
  const memberId = searchParams.get("memberId") || undefined;
  const message =
    searchParams.get("message") ||
    "Test: WhatsApp API Verbindung funktioniert ✅ (NF CRM)";

  if (!phoneParam && !memberId) {
    return NextResponse.json(
      { error: "phone or memberId is required" },
      { status: 400 }
    );
  }

  const member = memberId
    ? await prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true, vorname: true, whatsappNummer: true },
      })
    : null;

  const phone = phoneParam || member?.whatsappNummer || null;

  if (!phone) {
    return NextResponse.json(
      { error: "No WhatsApp number found" },
      { status: 400 }
    );
  }

  const sent = await sendWhatsApp({
    phone,
    message,
    memberId: member?.id,
    type: "MANUAL",
    ruleId: "MANUAL_TEST",
  });

  return NextResponse.json({
    success: sent,
    phone,
    member: member
      ? { id: member.id, vorname: member.vorname, whatsappNummer: member.whatsappNummer }
      : null,
  });
}

// Also support GET so you can trigger from the browser
export async function GET(request: NextRequest) {
  return POST(request);
}
