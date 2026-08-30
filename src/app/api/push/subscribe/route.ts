import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subscription, deviceName } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: "Invalid subscription payload." }, { status: 400 });
    }

    const userAgent = req.headers.get("user-agent") || "Unknown Browser";

    const savedSub = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId: user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
        deviceName: deviceName || (userAgent.includes("Chrome") ? "Chrome Device" : userAgent.includes("Firefox") ? "Firefox Device" : "Browser Device"),
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
        deviceName: deviceName || (userAgent.includes("Chrome") ? "Chrome Device" : userAgent.includes("Firefox") ? "Firefox Device" : "Browser Device"),
      },
    });

    return NextResponse.json({ success: true, subscriptionId: savedSub.id });
  } catch (error: any) {
    console.error("[Push Subscribe Error]:", error);
    return NextResponse.json({ error: "Failed to register push subscription" }, { status: 500 });
  }
}
