import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfigRequired } from "@/components/shared/config-required";
import { resolveSystemEntryState } from "@/lib/server/bootstrap";

export default async function LoginPage() {
  const entry = await resolveSystemEntryState();

  if (entry.state === "config_broken") {
    return <ConfigRequired title="لا يمكن عرض صفحة الدخول قبل إصلاح الإعدادات" diagnostics={entry.diagnostics} />;
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
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef5ff_100%)] px-4">
      <div className="grid w-full max-w-5xl gap-8 rounded-[2rem] border border-white/70 bg-white/95 p-6 shadow-soft lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5 rounded-[1.75rem] bg-slate-950 p-6 text-white">
          <p className="text-sm font-semibold text-emerald-300">الدخول إلى النظام</p>
          <h1 className="text-4xl font-bold leading-tight">ابدأ من الواجهة المناسبة لك بدون أي تعقيد</h1>
          <p className="text-base leading-8 text-slate-300">
            بعد اكتمال الإعداد الأول يصبح هذا المسار هو نقطة الدخول الطبيعية. اختر دخول الإدارة أو دخول العامل حسب دورك.
          </p>
        </section>

        <section className="space-y-4">
          <Link
            href="/admin/login"
            className="block rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft transition hover:border-brand/30 hover:bg-brand/5"
          >
            <p className="text-sm font-semibold text-brand">للإدارة</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">دخول الأدمن</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              إدارة العمال، الإعدادات، Telegram، التقارير، وسجل التدقيق.
            </p>
          </Link>

          <Link
            href="/worker/login"
            className="block rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <p className="text-sm font-semibold text-emerald-700">للعمل اليومي</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">دخول العامل</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              استلام المناوبة، تسجيل العمليات، وإغلاق المناوبة بواجهة عربية مبسطة.
            </p>
          </Link>
        </section>
      </div>
    </div>
  );
}
