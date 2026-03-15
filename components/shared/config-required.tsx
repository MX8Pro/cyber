import Link from "next/link";
import type { FirebaseAdminDiagnostics } from "@/lib/server/firebase-admin";

const statusCopy: Record<FirebaseAdminDiagnostics["status"], { label: string; description: string }> = {
  missing_env: {
    label: "التهيئة ناقصة",
    description: "بعض متغيرات Firebase Admin مفقودة أو أن خادم التطوير لم يلتقطها بعد."
  },
  invalid_credentials: {
    label: "بيانات الاعتماد غير صالحة",
    description: "المتغيرات موجودة لكن صيغة بيانات الخدمة أو private key غير صالحة."
  },
  init_failed: {
    label: "فشل إنشاء Firebase Admin",
    description: "الخادم قرأ الإعدادات لكنه فشل في إنشاء الاعتماد الإداري. أعد التشغيل ثم راجع المفاتيح."
  },
  ready: {
    label: "جاهز",
    description: "تهيئة Firebase Admin مكتملة."
  }
};

function issueToArabic(issue: string) {
  const map: Record<string, string> = {
    missing_project_id: "المتغير FIREBASE_ADMIN_PROJECT_ID غير موجود.",
    missing_client_email: "المتغير FIREBASE_ADMIN_CLIENT_EMAIL غير موجود.",
    missing_private_key: "المتغير FIREBASE_ADMIN_PRIVATE_KEY غير موجود.",
    private_key_format: "صيغة private key غير صحيحة.",
    json_parse_failed: "تعذر قراءة JSON الخاص بحساب الخدمة.",
    json_incomplete: "بيانات حساب الخدمة من JSON غير مكتملة."
  };

  return map[issue] ?? "يوجد سبب تقني داخلي يمنع التهيئة، راجع سجل الخادم.";
}

export function ConfigRequired({
  title,
  diagnostics
}: {
  title: string;
  diagnostics: FirebaseAdminDiagnostics;
}) {
  const status = statusCopy[diagnostics.status];

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
        <p className="text-sm font-semibold text-amber-700">إعداد مطلوب قبل التشغيل</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">{title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{status.description}</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-950">تشخيص الحالة</h2>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                {status.label}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">{diagnostics.message}</p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">تنبيه مهم</p>
              <p className="mt-2 leading-7">
                بعد أي تعديل في <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs">.env.local</span>
                {" "}يجب إيقاف <span className="font-mono">next dev</span> ثم تشغيله من جديد حتى يقرأ الخادم القيم الجديدة.
              </p>
              {process.env.NODE_ENV === "development" ? (
                <Link
                  href="/setup/diagnostics"
                  className="mt-3 inline-flex text-sm font-semibold text-brand transition hover:text-brand-700"
                >
                  فتح صفحة التشخيص التطويرية
                </Link>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl bg-slate-50 p-5">
            <h2 className="text-base font-bold text-slate-950">فحص المتغيرات</h2>
            <div className="mt-4 space-y-3">
              {diagnostics.envChecks.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <span className="font-mono text-slate-700">{item.key}</span>
                  <span
                    className={
                      item.present
                        ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                        : "rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700"
                    }
                  >
                    {item.present ? "موجود" : "غير موجود"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {diagnostics.issues.length > 0 ? (
          <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-base font-bold text-amber-900">ما الذي يجب مراجعته</h2>
            <div className="mt-3 space-y-2 text-sm leading-7 text-amber-950">
              {diagnostics.issues.map((issue) => (
                <p key={issue}>{issueToArabic(issue)}</p>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
