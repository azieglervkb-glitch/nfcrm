import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth";

// Goals feature is not yet implemented in the database schema
// This is a stub that returns empty results

export async function GET() {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return empty array - goals feature coming soon
    return NextResponse.json([]);
  } catch (error) {
    console.error("Failed to fetch goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
    console.error("Failed to create goal:", error);
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    );
  }
}
