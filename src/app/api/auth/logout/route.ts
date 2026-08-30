import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: "Logged out successfully." });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
