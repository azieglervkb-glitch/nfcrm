import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth";

// Goals feature is not yet implemented in the database schema
// This is a stub that returns not implemented

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Goals feature not yet implemented
    return NextResponse.json(
      { message: "Goals feature coming soon" },
      { status: 501 }
    );
  } catch (error) {
    console.error("Failed to update goal:", error);
    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Goals feature not yet implemented
    return NextResponse.json(
      { message: "Goals feature coming soon" },
      { status: 501 }
    );
  } catch (error) {
    console.error("Failed to delete goal:", error);
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 }
    );
  }
}
