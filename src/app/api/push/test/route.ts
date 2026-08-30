import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendPushToUser } from "@/lib/services/push-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await sendPushToUser(user.id, {
      title: "🔔 VisionTrack Desktop Notification",
      message: "Browser push notifications are active! You will receive live updates even when on other tabs.",
      url: "/dashboard",
      requireInteraction: false,
    });

    return NextResponse.json({
      success: true,
      result,
      message: "Test browser notification triggered successfully!",
    });
  } catch (error: any) {
    console.error("[Push Test Error]:", error);
    return NextResponse.json({ error: "Failed to trigger test notification" }, { status: 500 });
  }
}
