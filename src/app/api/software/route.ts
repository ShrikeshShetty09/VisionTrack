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
      return NextResponse.json({ error: "Only admins can manage software systems and modules." }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    // Sub-action: Create Module inside an individual software
    if (action === "CREATE_MODULE") {
      const { softwareId, name, description } = body;

      if (!softwareId || !name?.trim()) {
        return NextResponse.json({ error: "Software ID and module name are required." }, { status: 400 });
      }

      const targetSoftware = await prisma.software.findUnique({
        where: { id: softwareId },
      });

      if (!targetSoftware) {
        return NextResponse.json({ error: "Target software system not found." }, { status: 404 });
      }

      const existingMod = await prisma.module.findFirst({
        where: {
          softwareId,
          name: name.trim(),
        },
      });

      if (existingMod) {
        return NextResponse.json(
          { error: `Module "${name.trim()}" already exists in ${targetSoftware.name}.` },
          { status: 400 }
        );
      }

      const module = await prisma.module.create({
        data: {
          softwareId,
          name: name.trim(),
          description: description?.trim() || null,
        },
      });

      await recordAuditLog({
        userId: user.id,
        action: "MODULE_CREATED",
        entityType: "Software",
        entityId: softwareId,
        newValue: { softwareId, name: module.name, moduleId: module.id },
      });

      return NextResponse.json({ success: true, module });
    }

    // Default action: Create new Software Suite
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
    return NextResponse.json({ error: error.message || "Failed to create software system or module." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can delete software or modules." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get("moduleId");
    const softwareId = searchParams.get("softwareId");

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty on query-string delete
    }

    const targetModuleId = moduleId || body.moduleId;
    const targetSoftwareId = softwareId || body.softwareId;

    // 1. Delete Individual Module
    if (targetModuleId) {
      const existingModule = await prisma.module.findUnique({
        where: { id: targetModuleId },
      });

      if (!existingModule) {
        return NextResponse.json({ error: "Module not found." }, { status: 404 });
      }

      // Unlink from existing issues first to prevent foreign key errors
      await prisma.issue.updateMany({
        where: { moduleId: targetModuleId },
        data: { moduleId: null },
      });

      await prisma.module.delete({
        where: { id: targetModuleId },
      });

      await recordAuditLog({
        userId: user.id,
        action: "MODULE_DELETED",
        entityType: "Software",
        entityId: existingModule.softwareId,
        oldValue: { name: existingModule.name, moduleId: targetModuleId },
      });

      return NextResponse.json({ success: true, message: `Module "${existingModule.name}" removed successfully.` });
    }

    // 2. Delete / Archive Software System
    if (targetSoftwareId) {
      const existingSoftware = await prisma.software.findUnique({
        where: { id: targetSoftwareId },
      });

      if (!existingSoftware) {
        return NextResponse.json({ error: "Software not found." }, { status: 404 });
      }

      const issueCount = await prisma.issue.count({
        where: { softwareId: targetSoftwareId },
      });

      if (issueCount > 0) {
        // Soft delete so historical issues and metrics are preserved
        await prisma.software.update({
          where: { id: targetSoftwareId },
          data: { isActive: false },
        });

        await recordAuditLog({
          userId: user.id,
          action: "SOFTWARE_ARCHIVED",
          entityType: "Software",
          entityId: targetSoftwareId,
          newValue: { isActive: false },
        });

        return NextResponse.json({
          success: true,
          message: `Software "${existingSoftware.name}" has logged defects, so it has been deactivated and removed from active list.`,
        });
      } else {
        // Safe to hard delete software and its cascaded modules
        await prisma.software.delete({
          where: { id: targetSoftwareId },
        });

        await recordAuditLog({
          userId: user.id,
          action: "SOFTWARE_DELETED",
          entityType: "Software",
          entityId: targetSoftwareId,
          oldValue: { name: existingSoftware.name, code: existingSoftware.code },
        });

        return NextResponse.json({
          success: true,
          message: `Software "${existingSoftware.name}" deleted successfully.`,
        });
      }
    }

    return NextResponse.json(
      { error: "Please provide either moduleId or softwareId to delete." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Software DELETE Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to delete item." }, { status: 500 });
  }
}
