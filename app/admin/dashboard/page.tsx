import { AdminShell } from "@/components/admin/admin-shell";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { listAdminDashboardSummary } from "@/lib/server/repositories";
import { requireAdminSession } from "@/lib/server/session";
import type { AuditLogRecord, ShiftRecord, WorkerRecord } from "@/types";

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const { workers, shifts, auditLogs } = await listAdminDashboardSummary();
  const closedShifts = shifts.filter((shift: ShiftRecord) => shift.status === "closed");
  const reviewShifts = shifts.filter((shift: ShiftRecord) => shift.status === "needs_review" && !shift.review?.resolvedAt);
  const workerProfitTotal = closedShifts.reduce(
    (sum: number, shift: ShiftRecord) => sum + (shift.closing?.summary.workerProfitShare ?? 0),
    0
  );
  const shopProfitTotal = closedShifts.reduce(
    (sum: number, shift: ShiftRecord) => sum + (shift.closing?.summary.shopProfitShare ?? 0),
    0
  );

  return (
    <AdminShell adminName={session.email}>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <Card title="العمال النشطون" value={workers.filter((worker: WorkerRecord) => worker.isActive && !worker.deletedAt).length.toString()} />
        <Card title="المناوبات المفتوحة" value={shifts.filter((shift: ShiftRecord) => shift.status === "open").length.toString()} />
        <Card title="تحتاج مراجعة" value={reviewShifts.length.toString()} tone="amber" />
        <Card title="مجموع أرباح العمال" value={formatCurrency(workerProfitTotal)} />
        <Card title="مجموع أرباح المحل" value={formatCurrency(shopProfitTotal)} />
      </div>

      {reviewShifts.length ? (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-soft">
          <h2 className="text-xl font-bold text-slate-950">تنبيهات المناوبات المتروكة</h2>
          <div className="mt-4 space-y-3">
            {reviewShifts.slice(0, 5).map((shift: ShiftRecord) => (
              <div key={shift.id} className="rounded-2xl bg-white px-4 py-3">
                <p className="font-semibold text-slate-900">المناوبة {shift.shiftType} تحتاج مراجعة</p>
                <p className="mt-1 text-sm text-slate-500">{formatDateTime(shift.review?.flaggedAt ?? shift.updatedAt)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-bold text-slate-950">آخر الأنشطة الحساسة</h2>
        <div className="mt-4 space-y-3">
          {auditLogs.map((log: AuditLogRecord) => (
            <div key={log.id} className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="font-semibold text-slate-900">{log.action}</p>
              <p className="mt-1 text-sm text-slate-500">{formatDateTime(log.createdAt)}</p>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}

function Card({ title, value, tone = "slate" }: { title: string; value: string; tone?: "slate" | "amber" }) {
  return (
    <section
      className={`rounded-[2rem] border p-6 shadow-soft ${
        tone === "amber" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
    </section>
  );
}
