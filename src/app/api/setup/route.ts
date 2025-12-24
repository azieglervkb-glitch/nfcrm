import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

// One-time setup endpoint to initialize database
// DELETE THIS FILE AFTER FIRST USE IN PRODUCTION!

export async function POST(request: NextRequest) {
  // Simple security: require a setup key
  const { setupKey } = await request.json();

  if (setupKey !== "nf-setup-2024-init") {
    return NextResponse.json({ error: "Invalid setup key" }, { status: 401 });
  }

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@nf-mentoring.de" },
    });

    if (existingAdmin) {
      return NextResponse.json({
        message: "Setup already completed. Admin user exists.",
        adminEmail: "admin@nf-mentoring.de"
      });
    }

    // Create admin user
    const hashedPassword = await hash("admin123", 12);

    const admin = await prisma.user.create({
      data: {
        email: "admin@nf-mentoring.de",
        password: hashedPassword,
        vorname: "Admin",
        nachname: "NF Mentoring",
        role: "SUPER_ADMIN",
        aktiv: true,
      },
    });

    // Create default system settings
    const defaultSettings = [
      { key: "quiet_hours_enabled", value: "true", description: "Ruhezeiten für Benachrichtigungen aktiviert" },
      { key: "quiet_hours_start", value: "22:00", description: "Beginn der Ruhezeit" },
      { key: "quiet_hours_end", value: "07:00", description: "Ende der Ruhezeit" },
      { key: "default_coach_id", value: "", description: "Standard-Coach für neue Mitglieder" },
      { key: "automation_enabled", value: "true", description: "Automatisierungen global aktiviert" },
      { key: "email_notifications_enabled", value: "true", description: "E-Mail-Benachrichtigungen aktiviert" },
      { key: "whatsapp_notifications_enabled", value: "true", description: "WhatsApp-Benachrichtigungen aktiviert" },
    ];

    for (const setting of defaultSettings) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Setup completed successfully!",
      admin: {
        email: admin.email,
        password: "admin123",
        role: admin.role,
      },
      note: "WICHTIG: Lösche die Datei /src/app/api/setup/route.ts nach dem Setup!"
    });

  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Setup failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "NF CRM Setup Endpoint",
    usage: "POST mit { setupKey: 'nf-setup-2024-init' }",
    warning: "Nur einmal verwenden, dann diese Datei löschen!"
  });
}
