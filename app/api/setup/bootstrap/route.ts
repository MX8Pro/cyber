import { ZodError } from "zod";
import { headers } from "next/headers";
import { bootstrapAdminSchema } from "@/lib/validators/auth";
import { getSetupState } from "@/lib/server/bootstrap";
import { optionalEnv } from "@/lib/server/env";
import {
  getFirebaseAdminDiagnostics,
  getFirebaseAdminPublicErrorMessage
} from "@/lib/server/firebase-admin";
import { parseJson, jsonError, jsonOk } from "@/lib/server/http";
import { signInWithPassword } from "@/lib/server/identity-toolkit";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { createInitialAdmin } from "@/lib/server/repositories";
import { createSessionCookie, setSessionCookie } from "@/lib/server/session";

function normalizeSecret(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export async function POST(request: Request) {
  try {
    const diagnostics = getFirebaseAdminDiagnostics();
    if (diagnostics.status !== "ready") {
      return jsonError(getFirebaseAdminPublicErrorMessage(diagnostics) ?? "إعدادات Firebase Admin غير مكتملة", 503);
    }

    const hdrs = await headers();
    assertRateLimit(`setup:${hdrs.get("x-forwarded-for") ?? "local"}`, 5, 60_000);

    const currentSetup = await getSetupState();
    if (currentSetup.initialized) {
      return jsonError("تمت تهيئة النظام مسبقًا", 409);
    }

    const input = await parseJson(request, bootstrapAdminSchema);
    const expectedSecret = normalizeSecret(optionalEnv("SETUP_SECRET"));
    const providedSecret = normalizeSecret(input.setupSecret);

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return jsonError("رمز التهيئة الأولية غير صحيح. استخدم القيمة الموجودة في SETUP_SECRET داخل .env.local", 403);
    }

    await createInitialAdmin({
      email: input.email,
      password: input.password,
      fullName: input.fullName
    });

    const signIn = await signInWithPassword(input.email, input.password);
    const sessionCookie = await createSessionCookie(signIn.idToken);
    await setSessionCookie(sessionCookie);

    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues[0]?.message ?? "تحقق من القيم المدخلة ثم أعد المحاولة", 400);
    }

    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return jsonError("تم تجاوز عدد المحاولات المسموح به مؤقتًا. انتظر دقيقة ثم أعد المحاولة", 429);
    }

    if (error instanceof Error && error.message === "SETUP_ALREADY_COMPLETED") {
      return jsonError("تمت تهيئة النظام مسبقًا", 409);
    }

    return jsonError(error instanceof Error ? error.message : "تعذر إتمام التهيئة الأولى", 400);
  }
}
