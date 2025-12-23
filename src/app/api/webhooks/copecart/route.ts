import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

// Verify Copecart webhook signature
function verifySignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.COPECART_WEBHOOK_SECRET) return false;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.COPECART_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  return signature === expectedSignature;
}

// Map Copecart product IDs to our ProductType
function getProductType(productId: string): "VPMC" | "NFM" | "PREMIUM" | null {
  const productMap: Record<string, "VPMC" | "NFM" | "PREMIUM"> = {
    [process.env.COPECART_PRODUCT_VPMC || ""]: "VPMC",
    [process.env.COPECART_PRODUCT_NFM || ""]: "NFM",
    [process.env.COPECART_PRODUCT_PREMIUM || ""]: "PREMIUM",
  };

  return productMap[productId] || null;
}

// Generate secure token
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-copecart-signature");

  // Verify signature in production
  if (process.env.NODE_ENV === "production") {
    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  try {
    const event = JSON.parse(body);

    switch (event.event) {
      case "order.completed":
        await handleNewOrder(event.data);
        break;
      case "subscription.cancelled":
        await handleCancellation(event.data);
        break;
      case "subscription.paused":
        await handlePause(event.data);
        break;
      default:
        console.log("Unhandled Copecart event:", event.event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Copecart webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleNewOrder(data: any) {
  const { customer_email, customer_name, product_id, customer_id } = data;

  const productType = getProductType(product_id);
  if (!productType) {
    console.log("Unknown product:", product_id);
    return;
  }

  // Find or create member
  let member = await prisma.member.findUnique({
    where: { email: customer_email },
  });

  if (member) {
    // Add product if not already present
    if (!member.produkte.includes(productType)) {
      member = await prisma.member.update({
        where: { id: member.id },
        data: {
          produkte: { push: productType },
          status: "AKTIV",
          copecartCustomerId: customer_id,
        },
      });
    }
  } else {
    // Create new member
    const [vorname, ...nachnameParts] = (customer_name || "").split(" ");
    member = await prisma.member.create({
      data: {
        email: customer_email,
        vorname: vorname || "Neues",
        nachname: nachnameParts.join(" ") || "Mitglied",
        produkte: [productType],
        status: "AKTIV",
        membershipStart: new Date(),
        copecartCustomerId: customer_id,
      },
    });
  }

  // Create onboarding token
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.formToken.create({
    data: {
      token,
      type: "onboarding",
      memberId: member.id,
      expiresAt,
    },
  });

  // Send welcome email
  const onboardingUrl = `${process.env.APP_URL}/form/onboarding/${token}`;

  await sendEmail({
    to: member.email,
    subject: "Willkommen beim NF Mentoring!",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
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
            <a href="${onboardingUrl}" style="background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Onboarding starten
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">
            Der Link ist 7 Tage gültig.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 14px; text-align: center;">
            NF Mentoring | <a href="https://nf-mentoring.de" style="color: #dc2626;">nf-mentoring.de</a>
          </p>
        </div>
      </div>
    `,
  });

  // Log automation
  await prisma.automationLog.create({
    data: {
      memberId: member.id,
      ruleId: "WEBHOOK",
      ruleName: "Copecart Order",
      actionsTaken: [
        member.id ? "UPDATE_MEMBER" : "CREATE_MEMBER",
        "CREATE_ONBOARDING_TOKEN",
        "SEND_WELCOME_EMAIL",
      ],
      details: { productType, customerId: customer_id },
    },
  });
}

async function handleCancellation(data: any) {
  const { customer_email, product_id } = data;

  const member = await prisma.member.findUnique({
    where: { email: customer_email },
  });

  if (!member) return;

  // Set status to gekündigt
  await prisma.member.update({
    where: { id: member.id },
    data: {
      status: "GEKUENDIGT",
      membershipEnd: new Date(),
    },
  });

  // Create task for retention
  await prisma.task.create({
    data: {
      memberId: member.id,
      title: "Kündigungs-Feedback einholen",
      description: `${member.vorname} ${member.nachname} hat gekündigt. Feedback-Gespräch führen.`,
      priority: "HIGH",
      assignedToId: member.assignedCoachId,
    },
  });

  // Log
  await prisma.automationLog.create({
    data: {
      memberId: member.id,
      ruleId: "WEBHOOK",
      ruleName: "Copecart Cancellation",
      actionsTaken: ["SET_STATUS: GEKUENDIGT", "CREATE_TASK: Kündigungs-Feedback"],
    },
  });
}

async function handlePause(data: any) {
  const { customer_email } = data;

  const member = await prisma.member.findUnique({
    where: { email: customer_email },
  });

  if (!member) return;

  await prisma.member.update({
    where: { id: member.id },
    data: { status: "PAUSIERT" },
  });

  await prisma.automationLog.create({
    data: {
      memberId: member.id,
      ruleId: "WEBHOOK",
      ruleName: "Copecart Pause",
      actionsTaken: ["SET_STATUS: PAUSIERT"],
    },
  });
}
