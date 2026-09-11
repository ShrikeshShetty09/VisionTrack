import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "TESTER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Only Testers and Admins can view deleted issues." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const sortBy = searchParams.get("sortBy") || "deletedAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const where: any = {
      deletedAt: { not: null },
    };

    if (search) {
      where.OR = [
        { issueCode: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { deleteRemark: { contains: search, mode: "insensitive" } },
        { software: { name: { contains: search, mode: "insensitive" } } },
        { deletedBy: { name: { contains: search, mode: "insensitive" } } },
        { createdBy: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const orderBy: any = {};
    if (sortBy === "createdAt") {
      orderBy.createdAt = sortOrder;
    } else {
      orderBy.deletedAt = sortOrder;
    }

    const [total, issues] = await Promise.all([
      prisma.issue.count({ where }),
      prisma.issue.findMany({
        where,
        include: {
          software: { select: { id: true, name: true, code: true } },
          module: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true, role: true, profileImage: true } },
          deletedBy: { select: { id: true, name: true, email: true, role: true, profileImage: true } },
          assignedDeveloper: { select: { id: true, name: true, email: true, role: true, profileImage: true } },
          assignees: { select: { id: true, name: true, email: true, role: true, profileImage: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
    ]);

    return NextResponse.json({
      issues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[Deleted Issues GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch deleted issues" }, { status: 500 });
  }
}
