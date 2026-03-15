import { AdminShell } from "@/components/admin/admin-shell";
import { WorkerManagementForm } from "@/components/admin/worker-management-form";
import { WorkersTable } from "@/components/admin/workers-table";
import { listWorkersForAdmin } from "@/lib/server/repositories";
import { requireAdminSession } from "@/lib/server/session";

export default async function AdminWorkersPage() {
  const session = await requireAdminSession();
  const workers = await listWorkersForAdmin();
  type AdminWorker = Awaited<ReturnType<typeof listWorkersForAdmin>>[number];

  const activeWorkers = workers.filter((worker: AdminWorker) => worker.isActive && !worker.deletedAt);
  const inactiveWorkers = workers.filter((worker: AdminWorker) => !worker.isActive && !worker.deletedAt);
  const deletedWorkers = workers.filter((worker: AdminWorker) => Boolean(worker.deletedAt));

  return (
    <AdminShell adminName={session.email}>
      <div className="space-y-6">
        <section className="glass-panel mesh-bg rise-in overflow-hidden p-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <span className="inline-flex rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
                إدارة فريق العمل
              </span>
              <h1 className="text-3xl font-bold text-slate-950">أضف العمال ونظّم حساباتهم من مكان واحد واضح</h1>
              <p className="max-w-2xl text-base leading-8 text-slate-600">
                من هذه الصفحة تبدأ دورة العمل اليومية: إنشاء عامل جديد، ضبط كلمة السر الأولية، ومراقبة حالة الحسابات
                النشطة والمعطلة بدون ازدحام أو تعقيد.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <MetricCard label="العمال النشطون" value={activeWorkers.length.toString()} tone="emerald" />
              <MetricCard label="المعطلون" value={inactiveWorkers.length.toString()} tone="slate" />
              <MetricCard label="المحذوفون منطقيًا" value={deletedWorkers.length.toString()} tone="rose" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
          <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <WorkerManagementForm />
          </div>
          <WorkersTable workers={workers} />
        </div>
      </div>
    </AdminShell>
  );
}

function MetricCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "emerald" | "slate" | "rose";
}) {
  const tones = {
    emerald: "border-emerald-100 bg-emerald-50/80 text-emerald-800",
    slate: "border-slate-200 bg-white text-slate-800",
    rose: "border-rose-100 bg-rose-50/80 text-rose-800"
  } as const;

  return (
    <div className={`soft-ring rounded-[1.5rem] border p-4 ${tones[tone]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}
