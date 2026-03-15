import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/auth/admin-login-form";
import { ConfigRequired } from "@/components/shared/config-required";
import { resolveSystemEntryState } from "@/lib/server/bootstrap";

export default async function AdminLoginPage() {
  const entry = await resolveSystemEntryState();

  if (entry.state === "config_broken") {
    return <ConfigRequired title="صفحة المسؤول تحتاج إعداد Firebase Admin أولًا" diagnostics={entry.diagnostics} />;
  }

  if (entry.state === "setup_required") {
    redirect("/setup");
  }

  if (entry.state === "admin_authenticated") {
    redirect("/admin/dashboard");
  }

  if (entry.state === "worker_authenticated") {
    redirect("/worker/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="grid w-full max-w-5xl gap-10 rounded-[2rem] bg-white p-8 shadow-soft lg:grid-cols-[1.2fr_420px]">
        <div className="space-y-5">
          <p className="text-sm font-semibold text-brand">لوحة إدارة المحل</p>
          <h1 className="text-4xl font-bold text-slate-950">دخول مسؤول النظام</h1>
          <p className="text-lg leading-8 text-slate-600">
            من هنا تبدأ الإدارة الفعلية للنظام: العمال، الإعدادات، Telegram، التقارير، وسجل النشاطات الحساسة.
          </p>
          <Link href="/worker/login" className="inline-flex text-sm font-semibold text-slate-600 transition hover:text-brand">
            الذهاب إلى دخول العمال
          </Link>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
