import Link from "next/link";
import { ArrowLeftRight, ShieldCheck, Smartphone } from "lucide-react";
import { redirect } from "next/navigation";
import { WorkerLoginForm } from "@/components/auth/worker-login-form";
import { ConfigRequired } from "@/components/shared/config-required";
import { resolveSystemEntryState } from "@/lib/server/bootstrap";

export default async function WorkerLoginPage() {
  const entry = await resolveSystemEntryState();

  if (entry.state === "config_broken") {
    return <ConfigRequired title="واجهة العامل تحتاج إعداد Firebase Admin أولًا" diagnostics={entry.diagnostics} />;
  }

  if (entry.state === "setup_required") {
    redirect("/setup");
  }

  if (entry.state === "worker_authenticated") {
    redirect("/worker/dashboard");
  }

  if (entry.state === "admin_authenticated") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <section className="glass-panel rise-in relative overflow-hidden p-6 text-slate-950">
          <div className="absolute -left-12 top-10 h-40 w-40 rounded-full bg-brand/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-sky-200/30 blur-3xl" />

          <div className="relative space-y-5">
            <span className="inline-flex rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">دخول العمال</span>

            <div className="space-y-3">
              <h1 className="max-w-xl text-4xl font-bold leading-tight text-slate-950">واجهة بسيطة وواضحة للعمل اليومي داخل المحل</h1>
              <p className="max-w-2xl text-base leading-8 text-slate-600">
                اختر اسمك، أدخل كلمة السر، وابدأ العمل مباشرة. بعد الدخول يمكن متابعة المناوبة والعمليات حتى أثناء انقطاع الإنترنت، ثم تُرفع البيانات إلى Firebase تلقائيًا عند عودة الاتصال.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <FeatureCard icon={ShieldCheck} title="تحقق آمن" text="التحقق من كلمة السر يتم من الخادم وليس من الواجهة فقط." />
              <FeatureCard icon={Smartphone} title="هاتف أولًا" text="بطاقات كبيرة وأزرار واضحة لتناسب العمل السريع داخل المحل." />
              <FeatureCard icon={ArrowLeftRight} title="أوفلاين + مزامنة" text="يتم الحفظ محليًا أثناء الانقطاع ثم الرفع تلقائيًا عند رجوع الإنترنت." />
            </div>

            <div className="rounded-[1.75rem] bg-slate-950 p-5 text-white">
              <p className="text-sm text-slate-300">للإدارة فقط</p>
              <p className="mt-2 text-lg font-semibold">إذا كنت مسؤولًا وتريد إدارة العمال أو إعدادات Telegram فانتقل إلى بوابة الإدارة.</p>
              <Link href="/admin/login" className="mt-4 inline-flex text-sm font-semibold text-emerald-300 transition hover:text-emerald-200">
                الذهاب إلى دخول الإدارة
              </Link>
            </div>
          </div>
        </section>

        <div className="rise-in">
          <WorkerLoginForm />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-3 font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm leading-7 text-slate-500">{text}</p>
    </div>
  );
}
