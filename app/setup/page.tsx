import { redirect } from "next/navigation";
import { SetupAdminForm } from "@/components/auth/setup-admin-form";
import { ConfigRequired } from "@/components/shared/config-required";
import { resolveSystemEntryState } from "@/lib/server/bootstrap";

export default async function SetupPage() {
  const entry = await resolveSystemEntryState();

  if (entry.state === "config_broken") {
    return <ConfigRequired title="لا يمكن بدء التهيئة الأولى قبل ضبط Firebase Admin" diagnostics={entry.diagnostics} />;
  }

  if (entry.state === "admin_authenticated") {
    redirect("/admin/dashboard");
  }

  if (entry.state === "worker_authenticated") {
    redirect("/worker/dashboard");
  }

  if (entry.state === "ready_no_session") {
    redirect("/login");
  }

  const isRecoveryMode = entry.setup.bootstrapHealth === "orphaned";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="grid w-full max-w-6xl gap-10 rounded-[2rem] bg-white p-8 shadow-soft lg:grid-cols-[1.1fr_520px]">
        <div className="space-y-5">
          <p className="text-sm font-semibold text-brand">{isRecoveryMode ? "استرجاع إدارة النظام" : "الإعداد الأول للنظام"}</p>
          <h1 className="text-4xl font-bold text-slate-950">
            {isRecoveryMode ? "لا يوجد أدمن صالح حاليًا، أنشئ مسؤولًا جديدًا للمتابعة" : "أنشئ أول مسؤول ثم ابدأ العمل الفعلي"}
          </h1>
          <p className="text-lg leading-8 text-slate-600">
            {isRecoveryMode
              ? "تم اكتشاف أن حالة التهيئة موجودة لكن حساب الأدمن لم يعد صالحًا أو حُذف من Firebase Auth. يمكنك الآن إنشاء مسؤول جديد دون فقدان بيانات النظام الحالية."
              : "هذه الصفحة تظهر مرة واحدة فقط عندما لا يكون النظام مهيأ بعد. بعد نجاحها ينتقل النظام إلى التدفق العادي دون العودة إلى التهيئة من جديد."}
          </p>
        </div>
        <SetupAdminForm />
      </div>
    </div>
  );
}
