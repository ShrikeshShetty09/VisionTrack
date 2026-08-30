import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { recordAuditLog } from "@/lib/services/audit-service";
import { Role } from "@/types";

export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") as Role | null;
    const activeOnly = searchParams.get("activeOnly") === "true";
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (role) where.role = role;
    if (activeOnly) where.isActive = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        profileImage: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            assignedIssues: { where: { status: { notIn: ["RESOLVED"] } } },
            createdIssues: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("[Users GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrators can create new user accounts." }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Name, email, password, and role are required." }, { status: 400 });
    }

    if (!["ADMIN", "TESTER", "DEVELOPER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "A user with this email address already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: role as Role,
        isActive: true,
        notificationPreferences: {
          create: {
            desktopPush: true,
            email: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await recordAuditLog({
      userId: currentUser.id,
      action: "USER_CREATED",
      entityType: "User",
      entityId: newUser.id,
      newValue: { name: newUser.name, email: newUser.email, role: newUser.role },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      message: `${role} account for ${newUser.name} has been created successfully.`,
    });
  } catch (error: any) {
    console.error("[Users POST Error]:", error);
    return NextResponse.json({ error: "Failed to create user account." }, { status: 500 });
  }
}
