import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const dbUrl = process.env.DATABASE_URL || "";
  // Mask password for security: postgres://user:***@host:port/db...
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ":***@");

  const start = Date.now();
  try {
    const t0 = Date.now();
    const result = await prisma.$queryRaw`SELECT 1 as ping`;
    const queryTime = Date.now() - t0;

    const t1 = Date.now();
    const userCount = await prisma.user.count();
    const countTime = Date.now() - t1;

    return NextResponse.json({
      success: true,
      maskedUrl,
      queryTime,
      countTime,
      totalTime: Date.now() - start,
      userCount,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      maskedUrl,
      error: err.message,
      totalTime: Date.now() - start,
    }, { status: 500 });
  }
}
