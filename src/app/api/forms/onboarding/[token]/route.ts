import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const formToken = await prisma.formToken.findUnique({
      where: { token },
      include: {
        member: {
          select: {
            id: true,
            vorname: true,
            nachname: true,
            onboardingCompleted: true,
          },
        },
      },
    });

    if (!formToken) {
      return NextResponse.json({ error: "Token nicht gefunden" }, { status: 404 });
    }

    if (formToken.type !== "onboarding") {
      return NextResponse.json({ error: "Falscher Token-Typ" }, { status: 400 });
    }

    if (formToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "Token abgelaufen" }, { status: 400 });
    }

    if (formToken.usedAt) {
      return NextResponse.json({ error: "Token bereits verwendet" }, { status: 400 });
    }

    if (formToken.member.onboardingCompleted) {
      return NextResponse.json({ error: "Onboarding bereits abgeschlossen" }, { status: 400 });
    }

    return NextResponse.json({
      member: {
        vorname: formToken.member.vorname,
        nachname: formToken.member.nachname,
      },
    });
  } catch (error) {
    console.error("Error fetching onboarding form:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();

    const formToken = await prisma.formToken.findUnique({
      where: { token },
      include: {
        member: true,
      },
    });

    if (!formToken) {
      return NextResponse.json({ error: "Token nicht gefunden" }, { status: 404 });
    }

    if (formToken.type !== "onboarding") {
      return NextResponse.json({ error: "Falscher Token-Typ" }, { status: 400 });
    }

    if (formToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "Token abgelaufen" }, { status: 400 });
    }

    if (formToken.usedAt) {
      return NextResponse.json({ error: "Token bereits verwendet" }, { status: 400 });
    }

    // Update member with onboarding data
    await prisma.member.update({
      where: { id: formToken.memberId },
      data: {
        unternehmen: body.unternehmen,
        position: body.position,
        aktuellerMonatsumsatz: body.aktuellerMonatsumsatz,
        wasNervtAmMeisten: body.wasNervtAmMeisten,
        groessetesProblem: body.groessetesProblem,
        zielMonatsumsatz: body.zielMonatsumsatz,
        groessteZielWarum: body.groessteZielWarum,
        wieAufmerksam: body.wieAufmerksam,
        onboardingCompleted: true,
        onboardingDate: new Date(),
      },
    });

    // Mark token as used
    await prisma.formToken.update({
      where: { id: formToken.id },
      data: { usedAt: new Date() },
    });

    // Create task for welcome call
    await prisma.task.create({
      data: {
        memberId: formToken.memberId,
        title: `Welcome Call mit ${formToken.member.vorname} ${formToken.member.nachname}`,
        description: `Onboarding abgeschlossen. Welcome Call vereinbaren.`,
        priority: "HIGH",
        status: "OPEN",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error submitting onboarding form:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
