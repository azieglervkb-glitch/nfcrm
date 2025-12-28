import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendOnboardingNotification } from "@/lib/onboarding";

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

  // Check if there's an existing lead to convert
  const existingLead = await prisma.lead.findUnique({
    where: { email: customer_email },
  });

  // Find or create member
  let member = await prisma.member.findUnique({
    where: { email: customer_email },
  });

  let isNewMember = false;

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
    // Create new member (use lead data if available)
    const [vorname, ...nachnameParts] = (customer_name || "").split(" ");
    member = await prisma.member.create({
      data: {
        email: customer_email,
        vorname: existingLead?.vorname || vorname || "Neues",
        nachname: existingLead?.nachname || nachnameParts.join(" ") || "Mitglied",
        telefon: existingLead?.telefon || null,
        whatsappNummer: existingLead?.whatsappNummer || null,
        produkte: [productType],
        status: "AKTIV",
        membershipStart: new Date(),
        copecartCustomerId: customer_id,
      },
    });
    isNewMember = true;
  }

  // Mark lead as converted if exists
  if (existingLead && existingLead.status !== "KONVERTIERT") {
    await prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        status: "KONVERTIERT",
        convertedToMemberId: member.id,
        convertedAt: new Date(),
      },
    });
  }

  // Send onboarding notification (Email + WhatsApp)
  const notificationResult = await sendOnboardingNotification({
    id: member.id,
    email: member.email,
    vorname: member.vorname,
    nachname: member.nachname,
    whatsappNummer: member.whatsappNummer,
  });

  // Log automation
  const actions = [
    isNewMember ? "CREATE_MEMBER" : "UPDATE_MEMBER",
    "CREATE_ONBOARDING_TOKEN",
    notificationResult.emailSent ? "SEND_ONBOARDING_EMAIL" : "EMAIL_FAILED",
    notificationResult.whatsappSent ? "SEND_ONBOARDING_WHATSAPP" : (member.whatsappNummer ? "WHATSAPP_FAILED" : "NO_WHATSAPP"),
  ];

  if (existingLead) {
    actions.push("CONVERT_LEAD");
  }

  await prisma.automationLog.create({
    data: {
      memberId: member.id,
      ruleId: "WEBHOOK",
      ruleName: "Copecart Order",
      actionsTaken: actions,
      details: {
        productType,
        customerId: customer_id,
        convertedFromLead: existingLead?.id || null,
      },
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
