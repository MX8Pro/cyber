import { AdminShell } from "@/components/admin/admin-shell";
import { formatCurrency, formatShiftType } from "@/lib/utils/format";
import { listClosedShiftReports, listShiftsForAdmin, listWorkersForAdmin } from "@/lib/server/repositories";
import { requireAdminSession } from "@/lib/server/session";
import type { ShiftRecord, WorkerRecord } from "@/types";

function workerName(workers: WorkerRecord[], workerId: string) {
  return workers.find((worker) => worker.id === workerId)?.displayName ?? workerId;
}

export default async function AdminReportsPage() {
  const session = await requireAdminSession();
  const [closedShifts, allShifts, workers] = await Promise.all([
    listClosedShiftReports(),
    listShiftsForAdmin(),
    listWorkersForAdmin()
  ]);
  const reviewShifts = allShifts.filter((shift: ShiftRecord) => shift.status === "needs_review");

  return (
    <AdminShell adminName={session.email}>
      <div className="space-y-6">
        {reviewShifts.length ? (
          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-soft">
            <h1 className="text-2xl font-bold text-slate-950">مناوبات خارج التقرير المالي</h1>
            <p className="mt-2 text-sm text-slate-600">هذه المناوبات تحتاج مراجعة ولا تدخل ضمن التقارير المغلقة السليمة.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {reviewShifts.map((shift: ShiftRecord) => (
                <div key={shift.id} className="rounded-2xl bg-white p-4">
                  <p className="font-semibold text-slate-900">
                    {workerName(workers, shift.workerId)} - {formatShiftType(shift.shiftType)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    الرصيد المتوقع: {formatCurrency(shift.review?.expectedShopCash ?? 0)} للمحل و{" "}
                    {formatCurrency(shift.review?.expectedFlexyCash ?? 0)} للفليكسي
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-2xl font-bold text-slate-950">تقارير الأرباح والفروقات</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-right">العامل</th>
                  <th className="px-4 py-3 text-right">المناوبة</th>
                  <th className="px-4 py-3 text-right">الفائدة الصافية</th>
                  <th className="px-4 py-3 text-right">حصة العامل</th>
                  <th className="px-4 py-3 text-right">حصة المحل</th>
                  <th className="px-4 py-3 text-right">أثر الفليكسي</th>
                </tr>
              </thead>
              <tbody>
                {closedShifts.map((shift: ShiftRecord) => (
                  <tr key={shift.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{workerName(workers, shift.workerId)}</td>
                    <td className="px-4 py-3">{formatShiftType(shift.shiftType)}</td>
                    <td className="px-4 py-3">{formatCurrency(shift.closing?.summary.netProfit ?? 0)}</td>
                    <td className="px-4 py-3">{formatCurrency(shift.closing?.summary.workerProfitShare ?? 0)}</td>
                    <td className="px-4 py-3">{formatCurrency(shift.closing?.summary.shopProfitShare ?? 0)}</td>
                    <td className="px-4 py-3">{formatCurrency(shift.closing?.summary.flexyTransactionsTotal ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
