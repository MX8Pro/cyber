import { headers } from "next/headers";
import { restoreWorkerSessionSchema } from "@/lib/validators/auth";
import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { signInWithCustomToken } from "@/lib/server/identity-toolkit";
import { assertRateLimit } from "@/lib/server/rate-limit";
import {
  findWorkerById,
  markWorkerLogin,
  verifyTrustedWorkerDevice
} from "@/lib/server/repositories";
import { createSessionCookie, setSessionCookie } from "@/lib/server/session";
import { getAdminAuthClient } from "@/lib/server/firebase-admin";

export async function POST(request: Request) {
  try {
    const hdrs = await headers();
    assertRateLimit(`worker-restore:${hdrs.get("x-forwarded-for") ?? "local"}`, 30, 60_000);
    const input = await parseJson(request, restoreWorkerSessionSchema);
    const worker = await findWorkerById(input.workerId);

    if (!worker || !worker.isActive || worker.deletedAt) {
      return jsonError("العامل غير متاح", 403);
    }

    await verifyTrustedWorkerDevice({
      workerId: input.workerId,
      deviceId: input.deviceId,
      browserId: input.browserId,
      deviceSecret: input.deviceSecret
    });

    const customToken = await ((getAdminAuthClient() as unknown) as {
      createCustomToken(uid: string, claims?: Record<string, unknown>): Promise<string>;
    }).createCustomToken(worker.authUid, {
      role: "worker",
      workerId: worker.id
    });
    const signIn = await signInWithCustomToken(customToken);
    const sessionCookie = await createSessionCookie(signIn.idToken);
    await setSessionCookie(sessionCookie);
    await markWorkerLogin(worker.authUid);

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر استرجاع جلسة العامل", 401);
  }
}
