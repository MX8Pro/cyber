import { headers } from "next/headers";
import { adminLoginSchema } from "@/lib/validators/auth";
import {
  getAdminAuthClient,
  getFirebaseAdminDiagnostics,
  getFirebaseAdminPublicErrorMessage
} from "@/lib/server/firebase-admin";
import { parseJson, jsonError, jsonOk } from "@/lib/server/http";
import { signInWithPassword } from "@/lib/server/identity-toolkit";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { setUserLastLogin } from "@/lib/server/repositories";
import { createSessionCookie, setSessionCookie } from "@/lib/server/session";

export async function POST(request: Request) {
  try {
    const diagnostics = getFirebaseAdminDiagnostics();
    if (diagnostics.status !== "ready") {
      return jsonError(getFirebaseAdminPublicErrorMessage(diagnostics) ?? "إعدادات Firebase Admin غير مكتملة", 503);
    }

    const hdrs = await headers();
    assertRateLimit(`admin-login:${hdrs.get("x-forwarded-for") ?? "local"}`, 10, 60_000);
    const input = await parseJson(request, adminLoginSchema);
    const signIn = await signInWithPassword(input.email, input.password);
    const decoded = await getAdminAuthClient().verifyIdToken(signIn.idToken);

    if (decoded.role !== "admin") {
      return jsonError("غير مصرح", 403);
    }

    const sessionCookie = await createSessionCookie(signIn.idToken);
    await setSessionCookie(sessionCookie);
    await setUserLastLogin(decoded.uid);

    return jsonOk({ ok: true });
  } catch {
    return jsonError("بيانات الدخول غير صحيحة", 401);
  }
}
