import webpush from "web-push";
import prisma from "@/lib/prisma";

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BOH0q90z44pZq9v8MvUeX_qU4jB9bT3aP0lJ8f3m1cT0pQ2n4r6v8x0z2y4w6u8s0q2n4r6v8x0z2y4w6u8s0";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "YOUR_VAPID_PRIVATE_KEY";
const _rawSubject = process.env.VAPID_SUBJECT || "support@visiondatalabs.com";
const VAPID_SUBJECT = _rawSubject.startsWith("mailto:") ? _rawSubject : `mailto:${_rawSubject}`;

let vapidConfigured = false;

function initVapid() {
  if (vapidConfigured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || VAPID_PRIVATE_KEY === "YOUR_VAPID_PRIVATE_KEY") {
    // If not properly configured, we can still run without throwing
    return false;
  }
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.warn("[Push Service]: Could not initialize VAPID details:", err);
    return false;
  }
}

export interface PushPayload {
  title: string;
  message: string;
  url?: string;
  tag?: string;
  issueId?: string;
  requireInteraction?: boolean;
}

/**
 * Send real Web Push notifications to all registered devices of a user.
 * Cleans up expired or unregistered subscriptions automatically.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const configured = initVapid();
  if (!configured) {
    console.log(`[Push Service (Mock/Dev)]: Push notification to user ${userId}:`, payload.title, payload.message);
    return { success: true, deliveredCount: 0, note: "VAPID key in demo mode" };
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, deliveredCount: 0 };
    }

    const payloadString = JSON.stringify({
      title: payload.title,
      message: payload.message,
      url: payload.url || "/dashboard",
      tag: payload.tag || `vt-${Date.now()}`,
      issueId: payload.issueId,
      requireInteraction: payload.requireInteraction !== false,
      badge: "/logo.png",
      icon: "/logo.png",
    });

    const pushPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payloadString);
        return { id: sub.id, success: true };
      } catch (err: any) {
        console.error(`[Push Service]: Error pushing to subscription ${sub.id}:`, err.statusCode || err.message);
        // If 404 or 410 (Gone), subscription has expired or user revoked browser permission -> prune from DB
        if (err.statusCode === 404 || err.statusCode === 410) {
          try {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
            console.log(`[Push Service]: Removed expired subscription ${sub.id}`);
          } catch (delErr) {
            // ignore
          }
        }
        return { id: sub.id, success: false };
      }
    });

    const results = await Promise.all(pushPromises);
    const deliveredCount = results.filter((r) => r.success).length;

    return { success: true, deliveredCount };
  } catch (error) {
    console.error(`[Push Service]: Error sending push notifications to user ${userId}:`, error);
    return { success: false, error };
  }
}
