import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import OpenAI from "openai";

// Test endpoint to verify OpenAI is working
// DELETE this file before production!

export async function GET() {
  const session = await auth();

  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if API key exists
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: "OPENAI_API_KEY ist nicht gesetzt in den Environment Variables"
    });
  }

  // Check if key looks valid (starts with sk-)
  if (!apiKey.startsWith("sk-")) {
    return NextResponse.json({
      success: false,
      error: "OPENAI_API_KEY scheint ungültig (sollte mit 'sk-' beginnen)"
    });
  }

  try {
    const openai = new OpenAI({ apiKey });

    // Simple test call
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "user", content: "Antworte nur mit: OK" }
      ],
      max_tokens: 10,
    });

    const reply = response.choices[0].message.content;

    return NextResponse.json({
      success: true,
      message: "OpenAI funktioniert!",
      testReply: reply,
      model: response.model,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Unbekannter Fehler",
      errorType: error.constructor.name,
      status: error.status,
    });
  }
}
