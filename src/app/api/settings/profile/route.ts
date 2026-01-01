import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        vorname: true,
        nachname: true,
        email: true,
        role: true,
        whatsappNummer: true,
        taskWhatsappEnabled: true,
        notifyOnKpiSubmission: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: `${user.vorname} ${user.nachname}`,
      vorname: user.vorname,
      nachname: user.nachname,
      email: user.email,
      role: user.role,
      whatsappNummer: user.whatsappNummer,
      taskWhatsappEnabled: user.taskWhatsappEnabled,
      notifyOnKpiSubmission: user.notifyOnKpiSubmission,
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { vorname, nachname, name, email, whatsappNummer, taskWhatsappEnabled, notifyOnKpiSubmission } = body;

    // Support both name (legacy) and vorname/nachname
    let updateVorname = vorname;
    let updateNachname = nachname;

    if (name && !vorname && !nachname) {
      const parts = name.split(" ");
      updateVorname = parts[0] || "";
      updateNachname = parts.slice(1).join(" ") || "";
    }

    // Check if email is already taken by another user
    if (email !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json(
          { message: "Email is already in use" },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        vorname: updateVorname,
        nachname: updateNachname,
        email,
        whatsappNummer: typeof whatsappNummer === "string" ? whatsappNummer : undefined,
        taskWhatsappEnabled: typeof taskWhatsappEnabled === "boolean" ? taskWhatsappEnabled : undefined,
        notifyOnKpiSubmission: typeof notifyOnKpiSubmission === "boolean" ? notifyOnKpiSubmission : undefined,
      },
      select: {
        id: true,
        vorname: true,
        nachname: true,
        email: true,
        role: true,
        whatsappNummer: true,
        taskWhatsappEnabled: true,
        notifyOnKpiSubmission: true,
      },
    });

    return NextResponse.json({
      id: updatedUser.id,
      name: `${updatedUser.vorname} ${updatedUser.nachname}`,
      vorname: updatedUser.vorname,
      nachname: updatedUser.nachname,
      email: updatedUser.email,
      role: updatedUser.role,
      whatsappNummer: updatedUser.whatsappNummer,
      taskWhatsappEnabled: updatedUser.taskWhatsappEnabled,
      notifyOnKpiSubmission: updatedUser.notifyOnKpiSubmission,
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
