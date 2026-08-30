import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { recordAuditLog } from "@/lib/services/audit-service";
import { Role } from "@/types";

export const dynamic = "force-dynamic";


export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrators can update user accounts." }, { status: 403 });
    }

    const userId = params.id;
    const body = await req.json();
    const { name, email, role, isActive, newPassword } = body;

    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (role && ["ADMIN", "TESTER", "DEVELOPER"].includes(role)) updateData.role = role as Role;
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (newPassword && newPassword.trim().length >= 6) {
      updateData.passwordHash = await hashPassword(newPassword.trim());
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await recordAuditLog({
      userId: currentUser.id,
      action: "USER_UPDATED",
      entityType: "User",
      entityId: userId,
      oldValue: { name: existing.name, email: existing.email, role: existing.role, isActive: existing.isActive },
      newValue: { name: updated.name, email: updated.email, role: updated.role, isActive: updated.isActive },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, user: updated, message: "User updated successfully." });
  } catch (error: any) {
    console.error("[User PUT Error]:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
