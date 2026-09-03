import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/services/audit-service";
import { dispatchNotification, notifyAdmins } from "@/lib/services/notification-service";
import { IssueStatus, Priority, Environment } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as IssueStatus | null;
    const priority = searchParams.get("priority") as Priority | null;
    const environment = searchParams.get("environment") as Environment | null;
    const softwareId = searchParams.get("softwareId") || "";
    const moduleId = searchParams.get("moduleId") || "";
    const developerId = searchParams.get("developerId") || "";
    const testerId = searchParams.get("testerId") || "";
    const overdueOnly = searchParams.get("overdue") === "true";
    const myIssuesOnly = searchParams.get("myIssues") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const where: any = {
      deletedAt: null,
    };

    // Role-specific scoping when requested
    if (myIssuesOnly) {
      if (user.role === "DEVELOPER") {
        where.assignedDeveloperId = user.id;
      } else if (user.role === "TESTER") {
        where.createdById = user.id;
      }
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (environment) where.environment = environment;
    if (softwareId) where.softwareId = softwareId;
    if (moduleId) where.moduleId = moduleId;
    if (developerId) where.assignedDeveloperId = developerId;
    if (testerId) where.createdById = testerId;

    if (overdueOnly) {
      where.isOverdue = true;
      where.status = { notIn: ["RESOLVED"] };
    }

    if (search) {
      where.OR = [
        { issueCode: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { jobUrl: { contains: search, mode: "insensitive" } },
        { software: { name: { contains: search, mode: "insensitive" } } },
        { module: { name: { contains: search, mode: "insensitive" } } },
        { createdBy: { name: { contains: search, mode: "insensitive" } } },
        { assignedDeveloper: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const total = await prisma.issue.count({ where });

    const orderBy: any = {};
    if (sortBy === "deadline") {
      orderBy.deadlineTimestamp = sortOrder;
    } else if (sortBy === "priority") {
      orderBy.priority = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const issues = await prisma.issue.findMany({
      where,
      include: {
        software: { select: { id: true, name: true, code: true } },
        module: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        assignedDeveloper: { select: { id: true, name: true, email: true, role: true } },
        resolutions: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { id: true, resolutionText: true, rootCause: true, createdAt: true },
        },
        testingRecords: {
          take: 1,
          orderBy: { testedAt: "desc" },
          select: { id: true, result: true, testingNotes: true, testedAt: true },
        },
        regressionRecords: {
          take: 1,
          orderBy: { testedAt: "desc" },
          select: { id: true, result: true, regressionNotes: true, testedAt: true },
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    });

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
    console.error("[Issues GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "TESTER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only Testers and Admins can create new issues." }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      softwareId,
      moduleId,
      environment = "TESTING",
      priority = "MEDIUM",
      jobUrl,
      assignedDeveloperId,
      deadlineDate,
      deadlineTime,
      deadlineTimestamp: clientDeadlineTimestamp,
      attachments = [],
    } = body;

    if (!title || !description || !softwareId) {
      return NextResponse.json(
        { error: "Title, description, and software system are mandatory." },
        { status: 400 }
      );
    }

    // Auto-generate sequential issue code: VT-000001
    // Find latest by code numerically (include soft-deleted to avoid conflicts)
    const lastIssue = await prisma.issue.findFirst({
      orderBy: { issueCode: "desc" },
      select: { issueCode: true },
    });

    let nextNumber = 1;
    if (lastIssue && lastIssue.issueCode.startsWith("VT-")) {
      const parsed = parseInt(lastIssue.issueCode.replace("VT-", ""), 10);
      if (!isNaN(parsed)) {
        nextNumber = parsed + 1;
      }
    }
    const issueCode = `VT-${String(nextNumber).padStart(6, "0")}`;

    // Compute deadline timestamp accurately if provided
    let deadlineTimestamp: Date | null = null;
    if (clientDeadlineTimestamp) {
      deadlineTimestamp = new Date(clientDeadlineTimestamp);
    } else if (deadlineDate) {
      const timeStr = deadlineTime && deadlineTime.includes(":") ? deadlineTime : "18:30";
      deadlineTimestamp = new Date(`${deadlineDate}T${timeStr}`);
    }

    const initialStatus: IssueStatus = assignedDeveloperId ? "ASSIGNED" : "NEW";

    const issue = await prisma.issue.create({
      data: {
        issueCode,
        title: title.trim(),
        description: description.trim(),
        softwareId,
        moduleId: moduleId || null,
        environment: environment as Environment,
        priority: priority as Priority,
        status: initialStatus,
        jobUrl: jobUrl?.trim() || null,
        createdById: user.id,
        assignedDeveloperId: assignedDeveloperId || null,
        deadlineDate: deadlineTimestamp,
        deadlineTime: deadlineTime || null,      // e.g. "18:30"
        deadlineTimestamp: deadlineTimestamp,    // full timestamp for alerts
        attachments: {
          create: attachments.map((att: any) => ({
            fileName: att.fileName || "attachment",
            fileUrl: att.fileUrl,
            fileSize: att.fileSize || 0,
            mimeType: att.mimeType || "application/octet-stream",
            uploadedById: user.id,
          })),
        },
      },
      include: {
        software: true,
        module: true,
        createdBy: true,
        assignedDeveloper: true,
        attachments: true,
      },
    });

    // Record creation history
    await prisma.issueStatusHistory.create({
      data: {
        issueId: issue.id,
        changedById: user.id,
        fromStatus: "NEW",
        toStatus: initialStatus,
        reason: assignedDeveloperId ? "Issue created and directly assigned to developer" : "Issue created by QA tester",
      },
    });

    // Record audit log
    await recordAuditLog({
      userId: user.id,
      action: "ISSUE_CREATED",
      entityType: "Issue",
      entityId: issue.id,
      newValue: {
        issueCode: issue.issueCode,
        title: issue.title,
        priority: issue.priority,
        assignedDeveloperId: issue.assignedDeveloperId,
        deadlineTimestamp,
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    // If developer assigned, create assignment record & send push notification
    if (assignedDeveloperId) {
      await prisma.issueAssignment.create({
        data: {
          issueId: issue.id,
          developerId: assignedDeveloperId,
          assignedById: user.id,
          deadline: deadlineTimestamp,
          notes: "Assigned during issue creation",
        },
      });

      const deadlineFormatted = deadlineTimestamp
        ? deadlineTimestamp.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
        : "No deadline specified";

      await dispatchNotification({
        userId: assignedDeveloperId,
        type: "ISSUE_ASSIGNED",
        title: `🔔 New Issue Assigned — ${issue.issueCode}`,
        message: `${issue.title} has been assigned to you by ${user.name}. Deadline: ${deadlineFormatted}`,
        issueId: issue.id,
        issueCode: issue.issueCode,
        issueTitle: issue.title,
        actionUrl: `/issues/${issue.issueCode}`,
        emailDetails: [
          { label: "Software", value: issue.software.name },
          { label: "Priority", value: issue.priority },
          { label: "Deadline", value: deadlineFormatted },
          { label: "Reported By", value: user.name },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      issue,
      message: `Issue ${issue.issueCode} created successfully.`,
    });
  } catch (error: any) {
    console.error("[Issue POST Error]:", error?.message || error);
    console.error("[Issue POST Stack]:", error?.stack);
    const userMessage = error?.message?.includes("Unique constraint")
      ? "An issue with this code already exists. Please retry."
      : error?.message?.includes("Foreign key")
      ? "Invalid software, module, or developer reference."
      : "Failed to create issue. Please check all fields and retry.";
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
