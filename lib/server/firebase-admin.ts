import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminEnvChecks, getServiceAccount } from "@/lib/server/env";

export type FirebaseAdminStatus =
  | "ready"
  | "missing_env"
  | "invalid_credentials"
  | "init_failed";

export interface FirebaseAdminDiagnostics {
  status: FirebaseAdminStatus;
  envChecks: ReturnType<typeof getFirebaseAdminEnvChecks>;
  source: "env" | "json" | null;
  issues: string[];
  message: string;
}

const publicStatusMessages: Record<Exclude<FirebaseAdminStatus, "ready">, string> = {
  missing_env: "إعدادات Firebase Admin ناقصة أو أن الخادم لم يلتقط ملف البيئة بعد.",
  invalid_credentials: "إعدادات Firebase Admin موجودة ولكن بيانات الاعتماد غير صالحة.",
  init_failed: "تعذر تشغيل Firebase Admin من جهة الخادم. أعد تشغيل الخادم ثم راجع الإعدادات."
};

let cachedDiagnostics: FirebaseAdminDiagnostics | null = null;

function createDiagnostics(
  status: FirebaseAdminStatus,
  message: string,
  issues: string[] = [],
  source: "env" | "json" | null = null
): FirebaseAdminDiagnostics {
  return {
    status,
    message,
    issues,
    source,
    envChecks: getFirebaseAdminEnvChecks()
  };
}

function resolveAdminApp() {
  const existingApp = ((getApps() as Array<{ name: string }>)[0] as
    | { name: string }
    | null
    | undefined) ?? null;
  if (existingApp) {
    cachedDiagnostics = createDiagnostics("ready", "تهيئة Firebase Admin جاهزة.", [], "env");
    return existingApp;
  }

  const { serviceAccount, issues, source } = getServiceAccount();
  if (!serviceAccount) {
    const status = issues.includes("private_key_format") || issues.includes("json_parse_failed") || issues.includes("json_incomplete")
      ? "invalid_credentials"
      : "missing_env";

    cachedDiagnostics = createDiagnostics(
      status,
      status === "missing_env"
        ? "إعدادات Firebase Admin ناقصة أو لم يلتقطها الخادم بعد."
        : "إعدادات Firebase Admin موجودة ولكن صيغة بيانات الاعتماد غير صالحة.",
      issues,
      source
    );
    return null;
  }

  try {
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId
    });
    cachedDiagnostics = createDiagnostics("ready", "تهيئة Firebase Admin جاهزة.", [], source);
    return app;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_init_error";
    const status = /private key|credential|certificate/i.test(message)
      ? "invalid_credentials"
      : "init_failed";

    cachedDiagnostics = createDiagnostics(
      status,
      status === "invalid_credentials"
        ? "تعذر إنشاء اعتماد Firebase Admin. راجع مفاتيح الخدمة وصيغة private key."
        : "فشل إنشاء Firebase Admin من جهة الخادم. أعد تشغيل الخادم ثم راجع الإعدادات.",
      [message],
      source
    );
    return null;
  }
}

export function getFirebaseAdminDiagnostics(): FirebaseAdminDiagnostics {
  if (cachedDiagnostics?.status === "ready") {
    return cachedDiagnostics;
  }

  const app = resolveAdminApp();
  if (app) {
    return cachedDiagnostics ?? createDiagnostics("ready", "تهيئة Firebase Admin جاهزة.", [], "env");
  }

  return (
    cachedDiagnostics ??
    createDiagnostics("missing_env", "إعدادات Firebase Admin ناقصة أو لم يلتقطها الخادم بعد.")
  );
}

export function isFirebaseAdminConfigured() {
  return getFirebaseAdminDiagnostics().status === "ready";
}

export function getFirebaseAdminPublicErrorMessage(diagnostics = getFirebaseAdminDiagnostics()) {
  if (diagnostics.status === "ready") {
    return null;
  }

  return publicStatusMessages[diagnostics.status];
}

export function getAdminAuthClient() {
  const app = resolveAdminApp();
  if (!app) {
    throw new Error("FIREBASE_ADMIN_NOT_CONFIGURED");
  }

  return getAuth(app) as ReturnType<typeof getAuth>;
}

export function getAdminDb() {
  const app = resolveAdminApp();
  if (!app) {
    throw new Error("FIREBASE_ADMIN_NOT_CONFIGURED");
  }

  return getFirestore(app);
}

export function resetFirebaseAdminDiagnosticsForTests() {
  cachedDiagnostics = null;
  const existingApp = ((getApps() as Array<{ delete(): Promise<void> }>)[0] as
    | { delete(): Promise<void> }
    | undefined);
  if (existingApp) {
    void existingApp.delete();
  }
}
