import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * OnePage Webhook Endpoint
 *
 * Empfängt neue Leads von OnePage Landingpages.
 *
 * Erwartetes Format (kann angepasst werden):
 * {
 *   email: string,
 *   firstName: string,   // oder vorname
 *   lastName: string,    // oder nachname
 *   phone?: string,      // oder telefon
 *   source?: string,     // z.B. "Landingpage XYZ"
 *   tags?: string[],     // Optional: Tags für Interessen
 *   leadId?: string,     // OnePage Lead ID
 *   ...                  // Weitere Felder werden in onepageData gespeichert
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const data = JSON.parse(body);

    // Flexibles Mapping für verschiedene Feldnamen
    const email = data.email || data.Email || data.e_mail;
    const vorname = data.firstName || data.vorname || data.first_name || data.Vorname || "";
    const nachname = data.lastName || data.nachname || data.last_name || data.Nachname || "";
    const telefon = data.phone || data.telefon || data.Phone || data.Telefon || null;
    const sourceDetail = data.source || data.page || data.landingpage || data.utm_source || null;
    const onepageLeadId = data.leadId || data.lead_id || data.id || null;

    // Validierung
    if (!email) {
      return NextResponse.json(
        { error: "E-Mail ist erforderlich" },
        { status: 400 }
      );
    }

    // Check if lead already exists
    const existingLead = await prisma.lead.findUnique({
      where: { email },
    });

    if (existingLead) {
      // Update existing lead with new data
      await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          onepageData: data,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        action: "updated",
        leadId: existingLead.id,
      });
    }

    // Check if already a member
    const existingMember = await prisma.member.findUnique({
      where: { email },
    });

    if (existingMember) {
      // Already a paying customer, log but don't create lead
      console.log(`OnePage webhook: ${email} is already a member`);
      return NextResponse.json({
        success: true,
        action: "skipped",
        reason: "already_member",
      });
    }

    // Determine interest based on tags or source
    let interessiertAn: string | null = null;
    if (data.tags && Array.isArray(data.tags)) {
      if (data.tags.includes("NFM") || data.tags.includes("mentoring")) {
        interessiertAn = "NFM";
      } else if (data.tags.includes("VPMC") || data.tags.includes("verkauf")) {
        interessiertAn = "VPMC";
      }
    }

    // Create new lead
    const lead = await prisma.lead.create({
      data: {
        email,
        vorname: vorname || "Unbekannt",
        nachname: nachname || "Lead",
        telefon,
        source: "ONEPAGE",
        sourceDetail,
        onepageLeadId,
        onepageData: data,
        interessiertAn,
        status: "NEU",
      },
    });

    console.log(`OnePage webhook: Created new lead ${lead.id} for ${email}`);

    return NextResponse.json({
      success: true,
      action: "created",
      leadId: lead.id,
    });
  } catch (error) {
    console.error("OnePage webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// GET for webhook verification (some services send a GET first)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "ok",
    service: "OnePage Lead Webhook",
    endpoint: "/api/webhooks/onepage",
  });
}
