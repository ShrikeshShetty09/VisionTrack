import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/services/audit-service";
import { dispatchNotification, notifyAdmins } from "@/lib/services/notification-service";
import { validateStatusTransition } from "@/lib/services/issue-lifecycle";
import { IssueStatus, TestResult, RegressionResult } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = params;

    const whereClause: any = {
      OR: [{ issueCode: code }, { id: code }],
    };

    // Developers cannot see deleted issues or draft issues
    if (user.role === "DEVELOPER") {
      whereClause.deletedAt = null;
      whereClause.publicationStatus = "PUBLISHED";
    }

    const issue = await prisma.issue.findFirst({
      where: whereClause,
      include: {
        software: true,
        module: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true, profileImage: true },
        },
        deletedBy: {
          select: { id: true, name: true, email: true, role: true, profileImage: true },
        },
        assignedDeveloper: {
          select: { id: true, name: true, email: true, role: true, profileImage: true },
        },
        assignees: {
          select: { id: true, name: true, email: true, role: true, profileImage: true },
        },
        resolutions: {
          orderBy: { createdAt: "desc" },
          include: {
            developer: { select: { id: true, name: true, email: true } },
            attachments: true,
          },
        },
        testingRecords: {
          orderBy: { testedAt: "desc" },
          include: {
            tester: { select: { id: true, name: true, email: true } },
            attachments: true,
          },
        },
        regressionRecords: {
          orderBy: { testedAt: "desc" },
          include: {
            tester: { select: { id: true, name: true, email: true } },
            attachments: true,
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, email: true, role: true, profileImage: true } },
          },
        },
        attachments: {
          orderBy: { createdAt: "desc" },
          include: {
            uploadedBy: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        statusHistory: {
          orderBy: { createdAt: "asc" },
          include: {
            changedBy: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        assignments: {
          orderBy: { createdAt: "desc" },
          include: {
            developer: { select: { id: true, name: true, email: true } },
            assignedBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue not found." }, { status: 404 });
    }

    return NextResponse.json({ issue });
  } catch (error: any) {
    console.error("[Issue GET by Code Error]:", error);
    return NextResponse.json({ error: "Failed to fetch issue details" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = params;
    const body = await req.json();
    const { action } = body;

    const whereClause: any = {
      OR: [{ issueCode: code }, { id: code }],
    };
    if (action !== "RESTORE_ISSUE") {
      whereClause.deletedAt = null;
    }

    const issue = await prisma.issue.findFirst({
      where: whereClause,
      include: {
        software: true,
        createdBy: true,
        assignedDeveloper: true,
        assignees: true,
      },
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue not found." }, { status: 404 });
    }

    const isAssignedDev = issue.assignedDeveloperId === user.id || issue.assignees?.some((a) => a.id === user.id);
    const isCreator = issue.createdById === user.id;

    // ACTION 1: ASSIGN DEVELOPER & DEADLINE (Supports single or multiple users)
    if (action === "ASSIGN_DEVELOPER" || action === "UPDATE_ASSIGNMENT_AND_DEADLINE") {
      if (user.role !== "TESTER" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only Testers and Admins can assign issues or set deadlines." }, { status: 403 });
      }

      const {
        developerId,
        developerIds,
        assignedUserIds,
        deadlineDate,
        deadlineTime,
        deadlineTimestamp: clientDeadlineTimestamp,
        notes,
        clearDeadline,
      } = body;

      const hasDevsInput =
        Array.isArray(developerIds) || Array.isArray(assignedUserIds) || developerId !== undefined;
      const hasDeadlineInput =
        clientDeadlineTimestamp !== undefined || deadlineDate !== undefined || clearDeadline !== undefined;

      if (!hasDevsInput && !hasDeadlineInput) {
        return NextResponse.json({ error: "Please select assignees or specify a deadline." }, { status: 400 });
      }

      const rawDevIds: string[] = Array.isArray(developerIds)
        ? developerIds.filter(Boolean)
        : Array.isArray(assignedUserIds)
        ? assignedUserIds.filter(Boolean)
        : developerId
        ? [developerId]
        : [];
      const selectedDevIds = Array.from(new Set(rawDevIds));

      let devs: any[] = [];
      if (selectedDevIds.length > 0) {
        devs = await prisma.user.findMany({
          where: {
            id: { in: selectedDevIds },
            isActive: true,
          },
        });

        if (devs.length === 0) {
          return NextResponse.json({ error: "Selected user(s) are inactive or invalid." }, { status: 400 });
        }
      }

      // Compute deadline timestamp accurately
      let deadlineTimestamp: Date | null = issue.deadlineTimestamp;
      let deadlineTimeValue: string | null = issue.deadlineTime;

      if (clearDeadline === true || deadlineDate === "" || deadlineDate === null) {
        deadlineTimestamp = null;
        deadlineTimeValue = null;
      } else if (clientDeadlineTimestamp) {
        deadlineTimestamp = new Date(clientDeadlineTimestamp);
        deadlineTimeValue = deadlineTime || "18:30";
      } else if (deadlineDate) {
        const timeStr = deadlineTime && deadlineTime.includes(":") ? deadlineTime : "18:30";
        deadlineTimestamp = new Date(`${deadlineDate}T${timeStr}`);
        deadlineTimeValue = timeStr;
      }

      const prevDevId = issue.assignedDeveloperId;
      const prevStatus = issue.status;
      let newStatus: IssueStatus = issue.status;

      if (hasDevsInput) {
        if (devs.length > 0 && issue.status === "NEW") {
          newStatus = "ASSIGNED";
        } else if (devs.length === 0 && issue.status === "ASSIGNED") {
          newStatus = "NEW";
        }
      }

      const updateData: any = {
        status: newStatus,
        deadlineDate: deadlineTimestamp,
        deadlineTime: deadlineTimeValue,
        deadlineTimestamp: deadlineTimestamp,
        isOverdue: deadlineTimestamp ? deadlineTimestamp.getTime() < Date.now() : false,
      };

      if (hasDevsInput) {
        updateData.assignedDeveloperId = devs[0]?.id || null;
        updateData.assignees = {
          set: devs.map((d) => ({ id: d.id })),
        };
      }

      const updatedIssue = await prisma.issue.update({
        where: { id: issue.id },
        data: updateData,
        include: { assignedDeveloper: true, assignees: true, software: true, module: true },
      });

      // Assignment records for all assignees
      if (devs.length > 0) {
        for (const dev of devs) {
          await prisma.issueAssignment.create({
            data: {
              issueId: issue.id,
              developerId: dev.id,
              assignedById: user.id,
              deadline: deadlineTimestamp,
              notes: notes || null,
            },
          });
        }
      }

      // Status history if changed
      const devNames = devs.length > 0 ? devs.map((d) => d.name).join(", ") : "Unassigned";
      if (prevStatus !== newStatus) {
        await prisma.issueStatusHistory.create({
          data: {
            issueId: issue.id,
            changedById: user.id,
            fromStatus: prevStatus,
            toStatus: newStatus,
            reason: devs.length > 0 ? `Assigned to ${devNames}` : "Unassigned",
          },
        });
      } else if (hasDeadlineInput && !hasDevsInput) {
        await prisma.issueStatusHistory.create({
          data: {
            issueId: issue.id,
            changedById: user.id,
            fromStatus: prevStatus,
            toStatus: prevStatus,
            reason: deadlineTimestamp
              ? `Deadline set to ${deadlineTimestamp.toLocaleDateString()}`
              : "Deadline cleared",
          },
        });
      }

      // Audit Log
      await recordAuditLog({
        userId: user.id,
        action: devs.length > 0 ? "ISSUE_ASSIGNED" : "ISSUE_DEADLINE_UPDATED",
        entityType: "Issue",
        entityId: issue.id,
        oldValue: {
          assignedDeveloperId: prevDevId,
          assigneeIds: issue.assignees?.map((a: any) => a.id) || [],
          deadlineTimestamp: issue.deadlineTimestamp,
        },
        newValue: {
          assignedDeveloperId: devs[0]?.id || null,
          assigneeIds: devs.map((d: any) => d.id),
          deadlineTimestamp,
          status: newStatus,
        },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      const deadlineFormatted = deadlineTimestamp
        ? deadlineTimestamp.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
        : "No deadline set";

      // Push notification & email to each assigned user if devs were assigned
      if (devs.length > 0) {
        for (const dev of devs) {
          await dispatchNotification({
            userId: dev.id,
            type: "ISSUE_ASSIGNED",
            title: `🔔 Issue Assigned — ${issue.issueCode}`,
            message: `${issue.title} has been assigned to you by ${user.name}. Deadline: ${deadlineFormatted}`,
            issueId: issue.id,
            issueCode: issue.issueCode,
            issueTitle: issue.title,
            actionUrl: `/issues/${issue.issueCode}`,
            emailDetails: [
              { label: "Software", value: issue.software.name },
              { label: "Priority", value: issue.priority },
              { label: "Deadline", value: deadlineFormatted },
              { label: "Assigned By", value: user.name },
            ],
          });
        }
      }

      return NextResponse.json({
        success: true,
        issue: updatedIssue,
        message: devs.length > 0
          ? `Issue assigned to ${devNames} successfully.`
          : `Issue deadline updated successfully.`,
      });
    }

    // ACTION 2: DEVELOPER MARK AS IN_PROGRESS OR IN_REVIEW
    if (action === "DEVELOPER_STATUS_UPDATE") {
      const { targetStatus } = body;
      const validation = validateStatusTransition({
        currentStatus: issue.status,
        targetStatus,
        userRole: user.role,
        isAssignedDeveloper: isAssignedDev,
        isCreator,
      });

      if (!validation.allowed) {
        return NextResponse.json({ error: validation.reason }, { status: 400 });
      }

      const updated = await prisma.issue.update({
        where: { id: issue.id },
        data: { status: targetStatus },
      });

      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          changedById: user.id,
          fromStatus: issue.status,
          toStatus: targetStatus,
          reason: body.reason || `Developer changed status to ${targetStatus}`,
        },
      });

      await recordAuditLog({
        userId: user.id,
        action: "STATUS_CHANGED",
        entityType: "Issue",
        entityId: issue.id,
        oldValue: { status: issue.status },
        newValue: { status: targetStatus },
      });

      return NextResponse.json({ success: true, issue: updated });
    }

    // ACTION 3: DEVELOPER FIXED WORKFLOW (MANDATORY RESOLUTION DETAILS)
    if (action === "SUBMIT_FIX") {
      if (user.role !== "DEVELOPER" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only the assigned developer can submit a fix." }, { status: 403 });
      }

      if (user.role === "DEVELOPER" && !isAssignedDev) {
        return NextResponse.json({ error: "You can only submit fixes for issues assigned to you." }, { status: 403 });
      }

      const { resolutionText, rootCause, filesChanged, commitRef, additionalNotes, attachments = [] } = body;

      if (!resolutionText || !resolutionText.trim()) {
        return NextResponse.json({ error: "Resolution description is required." }, { status: 400 });
      }

      if (!rootCause || !rootCause.trim()) {
        return NextResponse.json({ error: "Root cause analysis is required." }, { status: 400 });
      }

      // Create Resolution record
      const resolution = await prisma.issueResolution.create({
        data: {
          issueId: issue.id,
          developerId: user.id,
          resolutionText: resolutionText.trim(),
          rootCause: rootCause.trim(),
          filesChanged: filesChanged?.trim() || null,
          commitRef: commitRef?.trim() || null,
          additionalNotes: additionalNotes?.trim() || null,
          attachments: {
            create: attachments.map((att: any) => ({
              fileName: att.fileName || "fix-attachment",
              fileUrl: att.fileUrl,
              fileSize: att.fileSize || 0,
              mimeType: att.mimeType || "application/octet-stream",
              uploadedById: user.id,
              issueId: issue.id,
            })),
          },
        },
      });

      // Update Issue Status to FIXED
      const updated = await prisma.issue.update({
        where: { id: issue.id },
        data: { status: "FIXED" },
        include: { software: true, createdBy: true },
      });

      // Status History
      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          changedById: user.id,
          fromStatus: issue.status,
          toStatus: "FIXED",
          reason: "Developer marked issue Fixed and submitted resolution details",
        },
      });

      // Audit Log
      await recordAuditLog({
        userId: user.id,
        action: "RESOLUTION_SUBMITTED",
        entityType: "Resolution",
        entityId: resolution.id,
        newValue: { resolutionText, rootCause, filesChanged, commitRef },
      });

      // Notify Tester and Admins
      await dispatchNotification({
        userId: issue.createdById,
        type: "ISSUE_FIXED",
        title: `🔧 Issue Fixed — Testing Required — ${issue.issueCode}`,
        message: `Issue ${issue.issueCode} has been marked as Fixed by ${user.name}. Testing is required.`,
        issueId: issue.id,
        issueCode: issue.issueCode,
        issueTitle: issue.title,
        actionUrl: `/issues/${issue.issueCode}`,
        requireInteraction: true,
        emailDetails: [
          { label: "Software", value: issue.software.name },
          { label: "Developer", value: user.name },
          { label: "Root Cause", value: rootCause.substring(0, 100) + "..." },
          { label: "Resolution", value: resolutionText.substring(0, 100) + "..." },
        ],
      });

      await notifyAdmins({
        type: "ISSUE_FIXED",
        title: `🔧 Issue Fixed — ${issue.issueCode}`,
        message: `Issue ${issue.issueCode} has been fixed by ${user.name}.`,
        issueId: issue.id,
        issueCode: issue.issueCode,
        issueTitle: issue.title,
        actionUrl: `/issues/${issue.issueCode}`,
      });

      return NextResponse.json({
        success: true,
        issue: updated,
        resolution,
        message: "Resolution details saved and issue marked as Fixed.",
      });
    }

    // ACTION 4: TESTER START TESTING
    if (action === "START_TESTING") {
      if (user.role !== "TESTER" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only testers and admins can test issues." }, { status: 403 });
      }

      if (issue.status !== "FIXED" && issue.status !== "REOPENED" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Testing can only be started on Fixed issues." }, { status: 400 });
      }

      const updated = await prisma.issue.update({
        where: { id: issue.id },
        data: { status: "TESTING_IN_PROGRESS" },
      });

      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          changedById: user.id,
          fromStatus: issue.status,
          toStatus: "TESTING_IN_PROGRESS",
          reason: `QA Tester ${user.name} started verification testing`,
        },
      });

      return NextResponse.json({ success: true, issue: updated });
    }

    // ACTION 5: TESTER SUBMIT TESTING RESULT (PASS/FAIL)
    if (action === "SUBMIT_TESTING") {
      if (user.role !== "TESTER" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only testers and admins can submit testing results." }, { status: 403 });
      }

      const { result, testingNotes, attachments = [] } = body;
      if (!result || !["PASS", "FAIL"].includes(result)) {
        return NextResponse.json({ error: "Testing result must be PASS or FAIL." }, { status: 400 });
      }

      if (!testingNotes || !testingNotes.trim()) {
        return NextResponse.json({ error: "Testing notes are required." }, { status: 400 });
      }

      const testRecord = await prisma.testingRecord.create({
        data: {
          issueId: issue.id,
          testerId: user.id,
          result: result as TestResult,
          testingNotes: testingNotes.trim(),
          attachments: {
            create: attachments.map((att: any) => ({
              fileName: att.fileName || "testing-evidence",
              fileUrl: att.fileUrl,
              fileSize: att.fileSize || 0,
              mimeType: att.mimeType || "application/octet-stream",
              uploadedById: user.id,
              issueId: issue.id,
            })),
          },
        },
      });

      let nextStatus: IssueStatus = "TESTED";
      let reopenInc = 0;

      if (result === "FAIL") {
        nextStatus = "REOPENED";
        reopenInc = 1;
      }

      const updated = await prisma.issue.update({
        where: { id: issue.id },
        data: {
          status: nextStatus,
          reopenCount: { increment: reopenInc },
        },
        include: { software: true, assignedDeveloper: true },
      });

      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          changedById: user.id,
          fromStatus: issue.status,
          toStatus: nextStatus,
          reason: result === "PASS" ? "Testing passed successfully" : `Testing failed: ${testingNotes.substring(0, 120)}`,
        },
      });

      await recordAuditLog({
        userId: user.id,
        action: result === "PASS" ? "TESTING_PASSED" : "TESTING_FAILED",
        entityType: "Testing",
        entityId: testRecord.id,
        newValue: { result, testingNotes },
      });

      // If test failed -> notify all Developers & Admin
      const notifyDevIdsOnFail = Array.from(
        new Set([
          issue.assignedDeveloperId,
          ...(issue.assignees?.map((a: any) => a.id) || []),
        ].filter(Boolean) as string[])
      );

      for (const devId of notifyDevIdsOnFail) {
        await dispatchNotification({
          userId: devId,
          type: "TEST_FAILED",
          title: `❌ Testing Failed — Issue Reopened: ${issue.issueCode}`,
          message: `QA Tester ${user.name} reported testing failure: "${testingNotes.substring(0, 100)}"`,
          issueId: issue.id,
          issueCode: issue.issueCode,
          issueTitle: issue.title,
          actionUrl: `/issues/${issue.issueCode}`,
          requireInteraction: true,
          emailDetails: [
            { label: "Software", value: issue.software.name },
            { label: "Tester", value: user.name },
            { label: "Failure Notes", value: testingNotes },
          ],
        });
      }

      return NextResponse.json({
        success: true,
        issue: updated,
        testRecord,
        message: result === "PASS" ? "Testing passed! Next step: Regression Testing." : "Testing failed. Issue has been reopened.",
      });
    }

    // ACTION 6: TESTER SUBMIT REGRESSION RESULT
    if (action === "SUBMIT_REGRESSION") {
      if (user.role !== "TESTER" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only testers and admins can perform regression verification." }, { status: 403 });
      }

      const { result, regressionNotes, attachments = [] } = body;
      if (!result || !["PASS", "FAIL"].includes(result)) {
        return NextResponse.json({ error: "Regression result must be PASS or FAIL." }, { status: 400 });
      }

      const regRecord = await prisma.regressionRecord.create({
        data: {
          issueId: issue.id,
          testerId: user.id,
          result: result as RegressionResult,
          regressionNotes: regressionNotes?.trim() || null,
          attachments: {
            create: attachments.map((att: any) => ({
              fileName: att.fileName || "regression-evidence",
              fileUrl: att.fileUrl,
              fileSize: att.fileSize || 0,
              mimeType: att.mimeType || "application/octet-stream",
              uploadedById: user.id,
              issueId: issue.id,
            })),
          },
        },
      });

      let nextStatus: IssueStatus = "RESOLVED";
      let reopenInc = 0;

      if (result === "FAIL") {
        nextStatus = "REOPENED";
        reopenInc = 1;
      }

      const updated = await prisma.issue.update({
        where: { id: issue.id },
        data: {
          status: nextStatus,
          reopenCount: { increment: reopenInc },
        },
        include: { software: true, assignedDeveloper: true },
      });

      await prisma.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          changedById: user.id,
          fromStatus: issue.status,
          toStatus: nextStatus,
          reason: result === "PASS" ? "Regression testing passed — issue successfully resolved!" : `Regression failed: ${regressionNotes || "Bug reappeared"}`,
        },
      });

      await recordAuditLog({
        userId: user.id,
        action: result === "PASS" ? "ISSUE_RESOLVED" : "REGRESSION_FAILED",
        entityType: "Regression",
        entityId: regRecord.id,
        newValue: { result, regressionNotes, status: nextStatus },
      });

      if (result === "FAIL") {
        const notifyDevIdsOnRegressionFail = Array.from(
          new Set([
            issue.assignedDeveloperId,
            ...(issue.assignees?.map((a: any) => a.id) || []),
          ].filter(Boolean) as string[])
        );

        for (const devId of notifyDevIdsOnRegressionFail) {
          await dispatchNotification({
            userId: devId,
            type: "REGRESSION_FAILED",
            title: `⚠️ Regression Failed — Issue Reopened: ${issue.issueCode}`,
            message: `Regression testing failed on ${issue.issueCode}. Please investigate.`,
            issueId: issue.id,
            issueCode: issue.issueCode,
            issueTitle: issue.title,
            actionUrl: `/issues/${issue.issueCode}`,
          });
        }
      }

      return NextResponse.json({
        success: true,
        issue: updated,
        regRecord,
        message: result === "PASS" ? "🎉 Issue verified & marked as RESOLVED!" : "Regression failed. Issue reopened.",
      });
    }

    // ACTION 7: ADD COMMENT
    if (action === "ADD_COMMENT") {
      const { message } = body;
      if (!message || !message.trim()) {
        return NextResponse.json({ error: "Comment message cannot be empty." }, { status: 400 });
      }

      const comment = await prisma.issueComment.create({
        data: {
          issueId: issue.id,
          authorId: user.id,
          message: message.trim(),
        },
        include: {
          author: { select: { id: true, name: true, role: true, profileImage: true } },
        },
      });

      // Notify participants: creator and all assignees (except commenter)
      const assigneeIds = Array.from(
        new Set([
          issue.assignedDeveloperId,
          ...(issue.assignees?.map((a: any) => a.id) || []),
        ].filter(Boolean) as string[])
      );

      const recipientIds = Array.from(
        new Set([issue.createdById, ...assigneeIds])
      ).filter((id) => id !== user.id);

      for (const recipientId of recipientIds) {
        await dispatchNotification({
          userId: recipientId,
          type: "COMMENT_ADDED",
          title: `💬 New Comment on ${issue.issueCode}`,
          message: `${user.name} (${user.role}): "${message.substring(0, 80)}${message.length > 80 ? "..." : ""}"`,
          issueId: issue.id,
          issueCode: issue.issueCode,
          issueTitle: issue.title,
          actionUrl: `/issues/${issue.issueCode}`,
        });
      }

      return NextResponse.json({ success: true, comment });
    }

    // ACTION 8: SOFT DELETE ISSUE WITH MANDATORY REMARK
    if (action === "DELETE_ISSUE") {
      if (user.role !== "TESTER" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only Testers and Admins can delete issues." }, { status: 403 });
      }

      const { deleteRemark } = body;
      if (!deleteRemark || !deleteRemark.trim()) {
        return NextResponse.json({ error: "A remark explaining why this issue is being deleted is required." }, { status: 400 });
      }

      const updated = await prisma.issue.update({
        where: { id: issue.id },
        data: {
          deletedAt: new Date(),
          deletedById: user.id,
          deleteRemark: deleteRemark.trim(),
        },
        include: {
          software: true,
          assignedDeveloper: true,
          assignees: true,
        },
      });

      await recordAuditLog({
        userId: user.id,
        action: "ISSUE_DELETED",
        entityType: "Issue",
        entityId: issue.id,
        oldValue: { status: issue.status, publicationStatus: issue.publicationStatus },
        newValue: { deletedAt: updated.deletedAt, deleteRemark: deleteRemark.trim() },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      // If assigned with developer, notify them immediately
      const assignedDevIds = Array.from(
        new Set([
          issue.assignedDeveloperId,
          ...(issue.assignees?.map((a: any) => a.id) || []),
        ].filter(Boolean) as string[])
      );

      for (const devId of assignedDevIds) {
        await dispatchNotification({
          userId: devId,
          type: "ISSUE_DELETED",
          title: `🗑️ Issue Deleted — ${issue.issueCode}`,
          message: `Issue ${issue.issueCode} ("${issue.title}") was deleted by ${user.name} (${user.role}). Reason: ${deleteRemark.trim()}`,
          issueId: issue.id,
          issueCode: issue.issueCode,
          issueTitle: issue.title,
          actionUrl: `/issues`,
          emailDetails: [
            { label: "Software", value: issue.software.name },
            { label: "Deleted By", value: `${user.name} (${user.role})` },
            { label: "Reason", value: deleteRemark.trim() },
          ],
        });
      }

      return NextResponse.json({
        success: true,
        issue: updated,
        message: `Issue ${issue.issueCode} deleted successfully.`,
      });
    }

    // ACTION 9: RESTORE SOFT-DELETED ISSUE
    if (action === "RESTORE_ISSUE") {
      if (user.role !== "TESTER" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only Testers and Admins can restore deleted issues." }, { status: 403 });
      }

      const updated = await prisma.issue.update({
        where: { id: issue.id },
        data: {
          deletedAt: null,
          deletedById: null,
          deleteRemark: null,
        },
      });

      await recordAuditLog({
        userId: user.id,
        action: "ISSUE_RESTORED",
        entityType: "Issue",
        entityId: issue.id,
        newValue: { deletedAt: null },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({
        success: true,
        issue: updated,
        message: `Issue ${issue.issueCode} restored successfully.`,
      });
    }

    // ACTION 10: SET / TOGGLE PUBLICATION STATUS (DRAFT <-> PUBLISHED)
    if (action === "SET_PUBLICATION_STATUS" || action === "TOGGLE_PUBLICATION_STATUS") {
      if (user.role !== "TESTER" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only Testers and Admins can change publication status." }, { status: 403 });
      }

      const targetPublicationStatus: "DRAFT" | "PUBLISHED" =
        body.publicationStatus === "DRAFT" || body.publicationStatus === "PUBLISHED"
          ? body.publicationStatus
          : issue.publicationStatus === "DRAFT"
          ? "PUBLISHED"
          : "DRAFT";

      const updated = await prisma.issue.update({
        where: { id: issue.id },
        data: { publicationStatus: targetPublicationStatus },
        include: {
          software: true,
          assignedDeveloper: true,
          assignees: true,
        },
      });

      await recordAuditLog({
        userId: user.id,
        action: "PUBLICATION_STATUS_CHANGED",
        entityType: "Issue",
        entityId: issue.id,
        oldValue: { publicationStatus: issue.publicationStatus },
        newValue: { publicationStatus: targetPublicationStatus },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      // If transitioned from DRAFT to PUBLISHED, send assignment notifications to assigned developers
      if (targetPublicationStatus === "PUBLISHED" && issue.publicationStatus === "DRAFT") {
        const assignedDevIds = Array.from(
          new Set([
            issue.assignedDeveloperId,
            ...(issue.assignees?.map((a: any) => a.id) || []),
          ].filter(Boolean) as string[])
        );

        const deadlineFormatted = issue.deadlineTimestamp
          ? new Date(issue.deadlineTimestamp).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "No deadline specified";

        for (const devId of assignedDevIds) {
          await dispatchNotification({
            userId: devId,
            type: "ISSUE_ASSIGNED",
            title: `🔔 Issue Published & Assigned — ${issue.issueCode}`,
            message: `${issue.title} has been published and assigned to you by ${user.name}. Deadline: ${deadlineFormatted}`,
            issueId: issue.id,
            issueCode: issue.issueCode,
            issueTitle: issue.title,
            actionUrl: `/issues/${issue.issueCode}`,
            emailDetails: [
              { label: "Software", value: issue.software.name },
              { label: "Priority", value: issue.priority },
              { label: "Deadline", value: deadlineFormatted },
              { label: "Published By", value: user.name },
            ],
          });
        }
      }

      return NextResponse.json({
        success: true,
        issue: updated,
        message: `Issue publication status updated to ${targetPublicationStatus}.`,
      });
    }

    // ACTION 11: EDIT ISSUE DETAILS (ADMIN & TESTER ONLY)
    if (action === "EDIT_ISSUE") {
      if (user.role !== "TESTER" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only Testers and Admins can edit issue details." }, { status: 403 });
      }

      const {
        title,
        description,
        softwareId,
        moduleId,
        environment,
        priority,
        jobUrl,
        publicationStatus,
      } = body;

      if (!title?.trim() || !description?.trim()) {
        return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
      }

      const updateData: any = {
        title: title.trim(),
        description: description.trim(),
        jobUrl: jobUrl !== undefined ? (jobUrl?.trim() || null) : issue.jobUrl,
      };

      if (softwareId) updateData.softwareId = softwareId;
      if (moduleId !== undefined) updateData.moduleId = moduleId || null;

      if (environment) {
        const envUpper = String(environment).toUpperCase().trim();
        if (["DEV", "PRODUCTION", "LOCAL", "TESTING"].includes(envUpper)) {
          updateData.environment = envUpper;
        }
      }

      if (priority) {
        const prioUpper = String(priority).toUpperCase().trim();
        if (["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(prioUpper)) {
          updateData.priority = prioUpper;
        }
      }

      if (publicationStatus && ["DRAFT", "PUBLISHED"].includes(publicationStatus)) {
        updateData.publicationStatus = publicationStatus;
      }

      const updated = await prisma.issue.update({
        where: { id: issue.id },
        data: updateData,
        include: {
          software: true,
          module: true,
          createdBy: true,
          assignedDeveloper: true,
          assignees: true,
        },
      });

      await recordAuditLog({
        userId: user.id,
        action: "ISSUE_EDITED",
        entityType: "Issue",
        entityId: issue.id,
        oldValue: {
          title: issue.title,
          description: issue.description,
          softwareId: issue.softwareId,
          moduleId: issue.moduleId,
          environment: issue.environment,
          priority: issue.priority,
          publicationStatus: issue.publicationStatus,
        },
        newValue: updateData,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({
        success: true,
        issue: updated,
        message: "Issue details updated successfully.",
      });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (error: any) {
    console.error("[Issue PUT Error]:", error);
    return NextResponse.json({ error: "Failed to update issue" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "TESTER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only Testers and Admins can delete issues." }, { status: 403 });
    }

    const { code } = params;
    let deleteRemark = "";
    try {
      const body = await req.json();
      deleteRemark = body.deleteRemark || "";
    } catch {
      deleteRemark = new URL(req.url).searchParams.get("deleteRemark") || "";
    }

    if (!deleteRemark.trim()) {
      return NextResponse.json({ error: "A remark explaining why this issue is being deleted is required." }, { status: 400 });
    }

    const issue = await prisma.issue.findFirst({
      where: {
        OR: [{ issueCode: code }, { id: code }],
        deletedAt: null,
      },
      include: {
        software: true,
        assignedDeveloper: true,
        assignees: true,
      },
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue not found." }, { status: 404 });
    }

    const updated = await prisma.issue.update({
      where: { id: issue.id },
      data: {
        deletedAt: new Date(),
        deletedById: user.id,
        deleteRemark: deleteRemark.trim(),
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: "ISSUE_DELETED",
      entityType: "Issue",
      entityId: issue.id,
      newValue: { deletedAt: updated.deletedAt, deleteRemark: deleteRemark.trim() },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    // Notify assigned developers
    const assignedDevIds = Array.from(
      new Set([
        issue.assignedDeveloperId,
        ...(issue.assignees?.map((a: any) => a.id) || []),
      ].filter(Boolean) as string[])
    );

    for (const devId of assignedDevIds) {
      await dispatchNotification({
        userId: devId,
        type: "ISSUE_DELETED",
        title: `🗑️ Issue Deleted — ${issue.issueCode}`,
        message: `Issue ${issue.issueCode} ("${issue.title}") has been deleted by ${user.name} (${user.role}). Reason: ${deleteRemark.trim()}`,
        issueId: issue.id,
        issueCode: issue.issueCode,
        issueTitle: issue.title,
        actionUrl: `/issues`,
        emailDetails: [
          { label: "Software", value: issue.software.name },
          { label: "Deleted By", value: `${user.name} (${user.role})` },
          { label: "Reason", value: deleteRemark.trim() },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      issue: updated,
      message: `Issue ${issue.issueCode} deleted successfully.`,
    });
  } catch (error: any) {
    console.error("[Issue DELETE Error]:", error);
    return NextResponse.json({ error: "Failed to delete issue" }, { status: 500 });
  }
}
