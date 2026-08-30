import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/services/audit-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const softwareList = await prisma.software.findMany({
      where: { isActive: true },
      include: {
        modules: {
          orderBy: { name: "asc" },
        },
        _count: {
          select: {
            issues: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ software: softwareList });
  } catch (error: any) {
    console.error("[Software GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch software list" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can add new software systems." }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, description, moduleNames } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Software name and code are required." }, { status: 400 });
    }

    const software = await prisma.software.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        modules: {
          create: Array.isArray(moduleNames)
            ? moduleNames.map((mod: string) => ({ name: mod.trim() }))
            : [],
        },
      },
      include: { modules: true },
    });

    await recordAuditLog({
      userId: user.id,
      action: "SOFTWARE_CREATED",
      entityType: "Software",
      entityId: software.id,
      newValue: { name: software.name, code: software.code },
    });

    return NextResponse.json({ success: true, software });
  } catch (error: any) {
    console.error("[Software POST Error]:", error);
    return NextResponse.json({ error: "Failed to create software system." }, { status: 500 });
  }
}
