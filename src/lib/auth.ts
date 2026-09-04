import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { UserSession, Role } from "@/types";
import prisma from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "visiontrack_secret_key_v2026_visiondatalabs";
const SESSION_COOKIE_NAME = "visiontrack_session";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signSessionToken(user: UserSession): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      isActive: user.isActive,
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

export function verifySessionToken(token: string): UserSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    return decoded;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser(req?: any): Promise<UserSession | null> {
  try {
    let token: string | undefined;

    // 1. Try from Next.js cookieStore
    try {
      const cookieStore = cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // cookies() might throw outside request context
    }

    // 2. Try from req headers if provided
    if (!token && req) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    // 3. Try from next/headers
    if (!token) {
      try {
        const { headers } = await import("next/headers");
        const headerStore = headers();
        const authHeader = headerStore.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.substring(7).trim();
        }
      } catch {
        // Ignore
      }
    }

    if (!token) return null;

    const session = verifySessionToken(token);
    if (!session || !session.id) return null;

    // Verify user is still active in database
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true, role: true, profileImage: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
      profileImage: user.profileImage,
      isActive: user.isActive,
    };
  } catch (err) {
    return null;
  }
}

export { SESSION_COOKIE_NAME };
