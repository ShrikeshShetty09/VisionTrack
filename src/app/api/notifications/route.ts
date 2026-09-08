import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// In-memory cache per user to strictly protect database from repetitive queries
interface CacheEntry {
  data: { notifications: any[]; unreadCount: number };
  timestamp: number;
}

const userNotificationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15000; // 15 seconds cache window

export function invalidateNotificationCache(userId?: string) {
  if (userId) {
    userNotificationCache.delete(userId);
  } else {
    userNotificationCache.clear();
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();
    const cached = userNotificationCache.get(user.id);

    // If data was fetched recently for this user, serve directly from RAM (ZERO DB QUERIES)
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      include: {
        issue: { select: { id: true, issueCode: true, title: true, priority: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    const responsePayload = { notifications, unreadCount };

    // Save to in-memory cache
    userNotificationCache.set(user.id, {
      data: responsePayload,
      timestamp: now,
    });

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("[Notifications GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { notificationId, markAll } = body;

    // Invalidate user cache on read update
    userNotificationCache.delete(user.id);

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId, userId: user.id },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error: any) {
    console.error("[Notifications PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
