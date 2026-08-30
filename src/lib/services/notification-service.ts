import prisma from "@/lib/prisma";
import { NotificationType } from "@/types";
import { sendPushToUser } from "./push-service";
import { sendBrevoEmail } from "./email-service";

export interface DispatchNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  issueId?: string;
  issueCode?: string;
  issueTitle?: string;
  actionUrl?: string;
  requireInteraction?: boolean;
  emailDetails?: { label: string; value: string }[];
}

/**
 * Central notification dispatcher:
 * 1. Inserts persistent notification into Database (Neon PostgreSQL)
 * 2. Triggers real Web Push browser notification to all active devices of the user
 * 3. Triggers Brevo Email if enabled in user's NotificationPreferences
 */
export async function dispatchNotification(params: DispatchNotificationParams) {
  try {
    // 1. Check user preferences
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      include: { notificationPreferences: true },
    });

    if (!user || !user.isActive) {
      return { success: false, reason: "User not found or inactive" };
    }

    const prefs = user.notificationPreferences;

    // Check if user disabled this specific category
    if (prefs) {
      if (params.type === "ISSUE_ASSIGNED" && !prefs.issueAssigned) return { success: true, muted: true };
      if (params.type === "STATUS_CHANGED" && !prefs.statusChanged) return { success: true, muted: true };
      if (params.type === "DEADLINE_30_MIN" && !prefs.deadline30Min) return { success: true, muted: true };
      if (params.type === "DEADLINE_10_MIN" && !prefs.deadline10Min) return { success: true, muted: true };
      if (params.type === "DEADLINE_OVERDUE" && !prefs.deadlineOverdue) return { success: true, muted: true };
      if (params.type === "ISSUE_FIXED" && !prefs.issueFixed) return { success: true, muted: true };
      if (params.type === "ISSUE_REOPENED" && !prefs.issueReopened) return { success: true, muted: true };
      if (params.type === "TESTING_REQUIRED" && !prefs.testingRequired) return { success: true, muted: true };
      if (params.type === "REGRESSION_REQUIRED" && !prefs.regressionRequired) return { success: true, muted: true };
    }

    // 2. Insert In-App DB Notification
    const dbNotification = await prisma.notification.create({
      data: {
        userId: params.userId,
        issueId: params.issueId || null,
        type: params.type,
        title: params.title,
        message: params.message,
      },
    });

    const targetUrl = params.actionUrl || (params.issueCode ? `/issues/${params.issueCode}` : "/dashboard");

    // 3. Trigger Real Browser Push Notification
    if (!prefs || prefs.desktopPush !== false) {
      await sendPushToUser(params.userId, {
        title: params.title,
        message: params.message,
        url: targetUrl,
        tag: `vt-notification-${params.type.toLowerCase()}-${params.issueId || "gen"}`,
        issueId: params.issueId,
        requireInteraction: params.requireInteraction || false,
      });
    }

    // 4. Trigger Brevo Email for critical alerts
    if (!prefs || prefs.email !== false) {
      const emailTypes: NotificationType[] = [
        "ISSUE_ASSIGNED",
        "ISSUE_FIXED",
        "ISSUE_REOPENED",
        "DEADLINE_30_MIN",
        "DEADLINE_10_MIN",
        "DEADLINE_OVERDUE",
        "TEST_FAILED",
        "REGRESSION_FAILED",
      ];

      if (emailTypes.includes(params.type)) {
        await sendBrevoEmail({
          to: [{ email: user.email, name: user.name }],
          subject: `[VisionTrack] ${params.title}`,
          title: params.title,
          headline: params.message,
          issueCode: params.issueCode,
          issueTitle: params.issueTitle,
          details: params.emailDetails,
          actionUrl: targetUrl,
        });
      }
    }

    return { success: true, notificationId: dbNotification.id };
  } catch (error) {
    console.error("[Notification Dispatcher Error]:", error);
    return { success: false, error };
  }
}

/**
 * Notify all admins about important events
 */
export async function notifyAdmins(params: Omit<DispatchNotificationParams, "userId">) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });

    const results = await Promise.all(
      admins.map((admin) =>
        dispatchNotification({
          ...params,
          userId: admin.id,
        })
      )
    );

    return results;
  } catch (error) {
    console.error("[Notify Admins Error]:", error);
    return [];
  }
}
