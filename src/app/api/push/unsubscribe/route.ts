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
    const { endpoint, subscriptionId } = body;

    if (subscriptionId) {
      await prisma.pushSubscription.deleteMany({
        where: { id: subscriptionId, userId: user.id },
      });
    } else if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: user.id },
      });
    }

    return NextResponse.json({ success: true, message: "Subscription removed." });
  } catch (error: any) {
    console.error("[Push Unsubscribe Error]:", error);
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }
}
