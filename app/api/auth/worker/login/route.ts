import { headers } from "next/headers";
import { workerLoginSchema } from "@/lib/validators/auth";
import {
  getAdminAuthClient,
  getFirebaseAdminDiagnostics,
  getFirebaseAdminPublicErrorMessage
} from "@/lib/server/firebase-admin";
import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { signInWithPassword } from "@/lib/server/identity-toolkit";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { findWorkerById, issueTrustedWorkerDevice, markWorkerLogin } from "@/lib/server/repositories";
import { createSessionCookie, setSessionCookie } from "@/lib/server/session";
import { sendConfiguredTelegramNotification, buildTelegramNotification } from "@/lib/server/telegram";

export async function POST(request: Request) {
  try {
    const diagnostics = getFirebaseAdminDiagnostics();
    if (diagnostics.status !== "ready") {
      return jsonError(getFirebaseAdminPublicErrorMessage(diagnostics) ?? "إعدادات Firebase Admin غير مكتملة", 503);
    }

    const hdrs = await headers();
    assertRateLimit(`worker-login:${hdrs.get("x-forwarded-for") ?? "local"}`, 15, 60_000);
    const input = await parseJson(request, workerLoginSchema);
    const worker = await findWorkerById(input.workerId);

    if (!worker || !worker.isActive || worker.deletedAt) {
      return jsonError("العامل غير متاح", 403);
    }

    const signIn = await signInWithPassword(worker.authEmail, input.password);
    const decoded = await getAdminAuthClient().verifyIdToken(signIn.idToken);

    if (decoded.role !== "worker" || decoded.workerId !== worker.id) {
      return jsonError("غير مصرح", 403);
    }

    const sessionCookie = await createSessionCookie(signIn.idToken);
    await setSessionCookie(sessionCookie);
    await markWorkerLogin(decoded.uid);

    let trustedDevice = null;
    let trustedDeviceError: string | null = null;

    if (input.browserId) {
      try {
        trustedDevice = await issueTrustedWorkerDevice({
          worker,
          browserId: input.browserId,
          userAgent: hdrs.get("user-agent") ?? undefined
        });
      } catch (error) {
        trustedDeviceError = "SERVER_ACTIVATION_FAILED";
        console.error("trusted device activation failed", error);
      }
    } else {
      trustedDeviceError = "BROWSER_ID_MISSING";
    }

    await sendConfiguredTelegramNotification(
      "worker_login",
      buildTelegramNotification({
        title: "تسجيل دخول عامل",
        level: "success",
        lines: [
          `العامل: ${worker.displayName}`,
          `المعرف: ${worker.id}`,
          `الجهاز: ${hdrs.get("user-agent")?.slice(0, 120) ?? "غير معروف"}`
        ]
      })
    ).catch((error) => {
      console.error("worker login telegram notification failed", error);
    });

    return jsonOk({
      ok: true,
      worker: {
        id: worker.id,
        displayName: worker.displayName,
        color: worker.color,
        icon: worker.icon
      },
      trustedDevice,
      trustedDeviceError
    });
  } catch (error) {
    console.error("worker login failed", error);
    return jsonError("بيانات الدخول غير صحيحة أو لم يكتمل تسجيل الدخول", 401);
  }
}
