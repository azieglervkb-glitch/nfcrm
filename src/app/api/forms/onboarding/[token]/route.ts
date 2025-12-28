import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // First try to find a FormToken
    const formToken = await prisma.formToken.findUnique({
      where: { token },
      include: {
        member: {
          select: {
            id: true,
            vorname: true,
            nachname: true,
            onboardingCompleted: true,
            // All onboarding fields for pre-filling
            unternehmen: true,
            position: true,
            aktuellerMonatsumsatz: true,
            wasNervtAmMeisten: true,
            groessetesProblem: true,
            zielMonatsumsatz: true,
            groessteZielWarum: true,
            wieAufmerksam: true,
          },
        },
      },
    });

    if (formToken) {
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

      const m = formToken.member;
      return NextResponse.json({
        member: {
          vorname: m.vorname,
          nachname: m.nachname,
          // Pre-fill existing data
          unternehmen: m.unternehmen,
          position: m.position,
          aktuellerMonatsumsatz: m.aktuellerMonatsumsatz,
          wasNervtAmMeisten: m.wasNervtAmMeisten,
          groessetesProblem: m.groessetesProblem,
          zielMonatsumsatz: m.zielMonatsumsatz,
          groessteZielWarum: m.groessteZielWarum,
          wieAufmerksam: m.wieAufmerksam,
        },
        isPreview: false,
      });
    }

    // If no token found, try to find by member ID (for admin preview)
    const member = await prisma.member.findUnique({
      where: { id: token },
      select: {
        id: true,
        vorname: true,
        nachname: true,
        onboardingCompleted: true,
        // All onboarding fields for pre-filling
        unternehmen: true,
        position: true,
        aktuellerMonatsumsatz: true,
        wasNervtAmMeisten: true,
        groessetesProblem: true,
        zielMonatsumsatz: true,
        groessteZielWarum: true,
        wieAufmerksam: true,
      },
    });

    if (member) {
      return NextResponse.json({
        member: {
          vorname: member.vorname,
          nachname: member.nachname,
          // Pre-fill existing data
          unternehmen: member.unternehmen,
          position: member.position,
          aktuellerMonatsumsatz: member.aktuellerMonatsumsatz,
          wasNervtAmMeisten: member.wasNervtAmMeisten,
          groessetesProblem: member.groessetesProblem,
          zielMonatsumsatz: member.zielMonatsumsatz,
          groessteZielWarum: member.groessteZielWarum,
          wieAufmerksam: member.wieAufmerksam,
        },
        isPreview: true,
      });
    }

    return NextResponse.json({ error: "Token nicht gefunden" }, { status: 404 });
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

    // Send welcome email (without KPI setup - that comes later when KPI tracking is activated)
    sendWelcomeEmail({
      id: formToken.memberId,
      email: formToken.member.email,
      vorname: formToken.member.vorname,
      nachname: formToken.member.nachname,
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error submitting onboarding form:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
