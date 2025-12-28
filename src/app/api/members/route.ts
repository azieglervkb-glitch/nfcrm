import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMemberSchema } from "@/lib/validations";
import { ZodError } from "zod";
import { sendEmail } from "@/lib/email";
import { generateFormUrl } from "@/lib/app-url";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: any = {};

  if (status && status !== "all") {
    if (status === "churn_risk") {
      where.churnRisk = true;
      where.status = "AKTIV";
    } else if (status === "review") {
      where.reviewFlag = true;
    } else if (status === "upsell") {
      where.upsellCandidate = true;
      where.status = "AKTIV";
    } else {
      where.status = status.toUpperCase();
    }
  }

  if (search) {
    where.OR = [
      { vorname: { contains: search, mode: "insensitive" } },
      { nachname: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  // Sichtbarkeits-Filterung: COACH/MITARBEITER sehen nur zugewiesene Members
  const userRole = session.user.role;
  if (userRole === "COACH" || userRole === "MITARBEITER") {
    where.assignedToId = session.user.id;
  }

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, vorname: true, nachname: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.member.count({ where }),
  ]);

  return NextResponse.json({
    members,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Remove fields that don't exist in database
    const { notizen, ...dataWithoutNotizen } = body;

    const validatedData = createMemberSchema.parse(dataWithoutNotizen);

    // Check if email already exists
    const existing = await prisma.member.findUnique({
      where: { email: validatedData.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ein Mitglied mit dieser E-Mail existiert bereits" },
        { status: 400 }
      );
    }

    const member = await prisma.member.create({
      data: validatedData,
    });

    // Create onboarding token and send welcome email (same as Copecart webhook)
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.formToken.create({
      data: {
        token,
        type: "onboarding",
        memberId: member.id,
        expiresAt,
      },
    });

    // Send welcome email with onboarding link
    const onboardingUrl = generateFormUrl("onboarding", token);
    await sendEmail({
      to: member.email,
      subject: "Willkommen beim NF Mentoring!",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ae1d2b 0%, #8a1722 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Willkommen beim NF Mentoring!</h1>
          </div>
          <div style="background: #ffffff; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 18px; color: #111827;">Hallo ${member.vorname}!</p>
            <p style="color: #6b7280; line-height: 1.6;">
              Vielen Dank für deine Anmeldung zum NF Mentoring. Wir freuen uns, dich auf deinem Weg zu unterstützen!
            </p>
            <p style="color: #6b7280; line-height: 1.6;">
              Um loszulegen, fülle bitte das kurze Onboarding-Formular aus:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${onboardingUrl}" style="background: #ae1d2b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Onboarding starten
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 14px;">
              Der Link ist 7 Tage gültig.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 14px; text-align: center;">
              NF Mentoring | <a href="https://nf-mentoring.de" style="color: #ae1d2b;">nf-mentoring.de</a>
            </p>
          </div>
        </div>
      `,
    }).catch((error) => {
      console.error("Failed to send onboarding email:", error);
      // Don't fail member creation if email fails
    });

    // Log automation
    await prisma.automationLog.create({
      data: {
        memberId: member.id,
        ruleId: "MANUAL",
        ruleName: "Manual Member Creation",
        actionsTaken: ["CREATE_MEMBER", "CREATE_ONBOARDING_TOKEN", "SEND_WELCOME_EMAIL"],
        details: {
          createdBy: session.user.id,
          email: member.email,
        },
      },
    }).catch((error) => {
      console.error("Failed to create automation log:", error);
      // Don't fail member creation if log fails
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Error creating member:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: error.issues },
        { status: 400 }
      );
    }

    // Return more detailed error in development
    const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Mitglieds", details: errorMessage },
      { status: 500 }
    );
  }
}
