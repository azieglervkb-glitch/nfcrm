import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
import { writeFile, unlink } from "fs/promises";
import path from "path";

const AVATAR_SIZE = 200; // Max dimension in pixels
const AVATAR_QUALITY = 85; // JPEG quality

/**
 * POST /api/member/profile/avatar
 * Upload avatar for member
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Keine Datei hochgeladen" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Ungültiger Dateityp. Erlaubt: JPG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Datei zu groß. Maximum: 5MB" },
        { status: 400 }
      );
    }

    // Get current member
    const member = await prisma.member.findUnique({
      where: { id: session.memberId },
      select: { id: true, avatarUrl: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member nicht gefunden" }, { status: 404 });
    }

    // Process image with sharp
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const processedImage = await sharp(buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: AVATAR_QUALITY })
      .toBuffer();

    // Generate filename with timestamp for cache busting
    const timestamp = Date.now();
    const filename = `member-${session.memberId}-${timestamp}.jpg`;
    const uploadPath = path.join(process.cwd(), "public", "uploads", "avatars", filename);

    // Write file
    await writeFile(uploadPath, processedImage);

    // Delete old avatar if exists
    if (member.avatarUrl) {
      const oldFilename = member.avatarUrl.split("/").pop();
      if (oldFilename) {
        const oldPath = path.join(process.cwd(), "public", "uploads", "avatars", oldFilename);
        try {
          await unlink(oldPath);
        } catch {
          // Ignore if file doesn't exist
        }
      }
    }

    // Update member with new avatar URL
    const avatarUrl = `/uploads/avatars/${filename}`;
    await prisma.member.update({
      where: { id: session.memberId },
      data: { avatarUrl },
    });

    return NextResponse.json({
      success: true,
      avatarUrl,
    });
  } catch (error) {
    console.error("Member avatar upload error:", error);
    return NextResponse.json(
      { error: "Fehler beim Hochladen des Avatars" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/member/profile/avatar
 * Remove avatar for member
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await prisma.member.findUnique({
      where: { id: session.memberId },
      select: { id: true, avatarUrl: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member nicht gefunden" }, { status: 404 });
    }

    // Delete file if exists
    if (member.avatarUrl) {
      const filename = member.avatarUrl.split("/").pop();
      if (filename) {
        const filePath = path.join(process.cwd(), "public", "uploads", "avatars", filename);
        try {
          await unlink(filePath);
        } catch {
          // Ignore if file doesn't exist
        }
      }
    }

    // Clear avatar URL in database
    await prisma.member.update({
      where: { id: session.memberId },
      data: { avatarUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Member avatar delete error:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Avatars" },
      { status: 500 }
    );
  }
}
