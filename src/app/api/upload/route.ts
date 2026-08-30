import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";


const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "text/plain",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 25MB size limit." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.name.match(/\.(png|jpg|jpeg|webp|pdf|docx|xlsx|txt)$/i)) {
      return NextResponse.json(
        { error: "Invalid file format. Allowed types: PNG, JPG, JPEG, WEBP, PDF, DOCX, XLSX." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${Date.now()}_${sanitizedName}`;

    // 1. If Vercel Blob Token is set, upload to Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`attachments/${uniqueFileName}`, buffer, {
          access: "public",
          contentType: file.type || "application/octet-stream",
        });

        return NextResponse.json({
          success: true,
          fileName: file.name,
          fileUrl: blob.url,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
        });
      } catch (blobErr) {
        console.warn("[Upload] Vercel Blob upload failed, falling back to local storage:", blobErr);
      }
    }

    // 2. Fallback: Save locally to public/uploads
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, uniqueFileName);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileUrl: publicUrl,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
    });
  } catch (error: any) {
    console.error("[Upload Error]:", error);
    return NextResponse.json({ error: "File upload failed." }, { status: 500 });
  }
}
