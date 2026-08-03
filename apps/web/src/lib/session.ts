import { cookies } from "next/headers";
import { prisma } from "@udyking/db";
import type { Role } from "@udyking/shared";
import { SESSION_COOKIE, signSession, verifySessionToken } from "@/lib/jwt";
import { ApiError } from "@/lib/api";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload?.sub) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true },
  });
  return user;
}

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Not authenticated");
  if (roles && !roles.includes(user.role)) {
    throw new ApiError(403, "Access denied");
  }
  return user;
}

export async function createSession(userId: string, role: Role): Promise<void> {
  const token = await signSession(userId, role);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
