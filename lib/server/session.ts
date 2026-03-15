import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuthClient, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "@/lib/server/constants";
import type { SessionUser, UserProfile } from "@/types";

async function getUserProfile(uid: string) {
  const snapshot = await getAdminDb().collection("users").doc(uid).get();
  return snapshot.exists ? (snapshot.data() as UserProfile) : null;
}

export async function createSessionCookie(idToken: string) {
  return getAdminAuthClient().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
}

export async function setSessionCookie(sessionCookie: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!cookie) {
    return null;
  }

  try {
    const decoded = await getAdminAuthClient().verifySessionCookie(cookie, true);
    const profile = await getUserProfile(decoded.uid);
    if (!profile || !profile.isActive) {
      return null;
    }

    return {
      uid: profile.uid,
      email: profile.email,
      role: profile.role,
      workerId: profile.workerId
    };
  } catch {
    return null;
  }
}

export async function requireAdminSession() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    redirect("/admin/login");
  }
  return session;
}

export async function requireWorkerSession() {
  const session = await getSessionUser();
  if (!session || session.role !== "worker" || !session.workerId) {
    redirect("/worker/login");
  }
  return session;
}

export async function requireRoleForApi(role: SessionUser["role"]) {
  const session = await getSessionUser();
  if (!session || session.role !== role) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
