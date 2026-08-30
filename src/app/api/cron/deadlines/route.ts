import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { dispatchNotification } from "@/lib/services/notification-service";
import { DeadlineReminderType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const nowMs = now.getTime();

    // 1. Fetch active unresolved issues with deadlines
    const activeIssues = await prisma.issue.findMany({
      where: {
        deadlineTimestamp: { not: null },
        status: { notIn: ["RESOLVED"] },
        deletedAt: null,
        assignedDeveloperId: { not: null },
      },
      include: {
        assignedDeveloper: true,
        software: true,
        deadlineReminders: true,
      },
    });

    let sentCount = 0;
    const remindersLogged: string[] = [];

    for (const issue of activeIssues) {
      if (!issue.deadlineTimestamp || !issue.assignedDeveloperId || !issue.assignedDeveloper) {
        continue;
      }

      const deadlineMs = new Date(issue.deadlineTimestamp).getTime();
      const diffMinutes = (deadlineMs - nowMs) / (1000 * 60);

      const existingReminders = new Set(
        issue.deadlineReminders.map((r) => r.reminderType)
      );

      const deadlineFormatted = issue.deadlineTimestamp.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });

      // 1. OVERDUE (deadline has passed)
      if (diffMinutes <= 0) {
        if (!issue.isOverdue) {
          await prisma.issue.update({
            where: { id: issue.id },
            data: { isOverdue: true },
          });
        }

        if (!existingReminders.has(DeadlineReminderType.OVERDUE)) {
          await prisma.deadlineReminder.create({
            data: {
              issueId: issue.id,
              developerId: issue.assignedDeveloperId,
              reminderType: DeadlineReminderType.OVERDUE,
            },
          });

          await dispatchNotification({
            userId: issue.assignedDeveloperId,
            type: "DEADLINE_OVERDUE",
            title: `🚨 Issue Overdue — ${issue.issueCode}`,
            message: `${issue.issueCode} (${issue.title}) has passed its deadline of ${deadlineFormatted}.`,
            issueId: issue.id,
            issueCode: issue.issueCode,
            issueTitle: issue.title,
            actionUrl: `/issues/${issue.issueCode}`,
            requireInteraction: true,
            emailDetails: [
              { label: "Software", value: issue.software.name },
              { label: "Priority", value: issue.priority },
              { label: "Deadline", value: deadlineFormatted },
              { label: "Current Status", value: issue.status },
            ],
          });

          sentCount++;
          remindersLogged.push(`OVERDUE: ${issue.issueCode}`);
        }
      }
      // 2. URGENT: 10 MINUTES REMINDER (between 0 and 10.5 mins)
      else if (diffMinutes <= 10.5 && diffMinutes > 0) {
        if (!existingReminders.has(DeadlineReminderType.REMINDER_10_MIN)) {
          await prisma.deadlineReminder.create({
            data: {
              issueId: issue.id,
              developerId: issue.assignedDeveloperId,
              reminderType: DeadlineReminderType.REMINDER_10_MIN,
            },
          });

          await dispatchNotification({
            userId: issue.assignedDeveloperId,
            type: "DEADLINE_10_MIN",
            title: `🔴 Urgent: Deadline in 10 Minutes — ${issue.issueCode}`,
            message: `Issue ${issue.issueCode} is due in ~10 minutes (${deadlineFormatted}).`,
            issueId: issue.id,
            issueCode: issue.issueCode,
            issueTitle: issue.title,
            actionUrl: `/issues/${issue.issueCode}`,
            requireInteraction: true,
            emailDetails: [
              { label: "Software", value: issue.software.name },
              { label: "Deadline", value: deadlineFormatted },
              { label: "Time Remaining", value: "~10 Minutes" },
            ],
          });

          sentCount++;
          remindersLogged.push(`10_MIN: ${issue.issueCode}`);
        }
      }
      // 3. 30 MINUTES REMINDER (between 10.5 and 30.5 mins)
      else if (diffMinutes <= 30.5 && diffMinutes > 10.5) {
        if (!existingReminders.has(DeadlineReminderType.REMINDER_30_MIN)) {
          await prisma.deadlineReminder.create({
            data: {
              issueId: issue.id,
              developerId: issue.assignedDeveloperId,
              reminderType: DeadlineReminderType.REMINDER_30_MIN,
            },
          });

          await dispatchNotification({
            userId: issue.assignedDeveloperId,
            type: "DEADLINE_30_MIN",
            title: `⚠️ Deadline Reminder: 30 Minutes — ${issue.issueCode}`,
            message: `Issue ${issue.issueCode} is due in ~30 minutes (${deadlineFormatted}).`,
            issueId: issue.id,
            issueCode: issue.issueCode,
            issueTitle: issue.title,
            actionUrl: `/issues/${issue.issueCode}`,
            emailDetails: [
              { label: "Software", value: issue.software.name },
              { label: "Deadline", value: deadlineFormatted },
              { label: "Time Remaining", value: "~30 Minutes" },
            ],
          });

          sentCount++;
          remindersLogged.push(`30_MIN: ${issue.issueCode}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedIssues: activeIssues.length,
      notificationsDispatched: sentCount,
      remindersLogged,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[Deadline Cron Worker Error]:", error);
    return NextResponse.json({ error: "Failed to run deadline check" }, { status: 500 });
  }
}
