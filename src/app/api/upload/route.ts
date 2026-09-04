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
    const user = await getCurrentUser(req);
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

    const mimeType = file.type || "application/octet-stream";
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(mimeType) || mimeType.startsWith("image/");
    const hasAllowedExt = file.name.match(/\.(png|jpg|jpeg|webp|gif|pdf|docx|xlsx|txt)$/i);

    if (!isAllowedMime && !hasAllowedExt) {
      return NextResponse.json(
        { error: "Invalid file format. Allowed types: PNG, JPG, JPEG, WEBP, GIF, PDF, DOCX, XLSX." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure valid extension for pasted images or blobs
    let fileName = file.name || `evidence_${Date.now()}.png`;
    if (!fileName.includes(".")) {
      if (mimeType === "image/png") fileName += ".png";
      else if (mimeType === "image/jpeg" || mimeType === "image/jpg") fileName += ".jpg";
      else if (mimeType === "image/webp") fileName += ".webp";
      else if (mimeType === "image/gif") fileName += ".gif";
      else fileName += ".png";
    }

    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${Date.now()}_${sanitizedName}`;

    // 1. If Vercel Blob Token is set, upload to Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`attachments/${uniqueFileName}`, buffer, {
          access: "public",
          contentType: mimeType,
        });

        return NextResponse.json({
          success: true,
          fileName,
          fileUrl: blob.url,
          fileSize: file.size,
          mimeType,
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
