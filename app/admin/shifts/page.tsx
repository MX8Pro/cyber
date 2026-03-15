import { AdminShell } from "@/components/admin/admin-shell";
import { ResolveShiftReviewButton } from "@/components/admin/resolve-shift-review-button";
import { formatCurrency, formatDateTime, formatShiftStatus, formatShiftType } from "@/lib/utils/format";
import { listShiftsForAdmin, listWorkersForAdmin } from "@/lib/server/repositories";
import { requireAdminSession } from "@/lib/server/session";
import type { ShiftRecord, WorkerRecord } from "@/types";

function workerName(workers: WorkerRecord[], workerId: string) {
  return workers.find((worker) => worker.id === workerId)?.displayName ?? workerId;
}

export default async function AdminShiftsPage() {
  const session = await requireAdminSession();
  const [shifts, workers] = await Promise.all([listShiftsForAdmin(), listWorkersForAdmin()]);
  const reviewShifts = shifts.filter((shift: ShiftRecord) => shift.status === "needs_review");

  return (
    <AdminShell adminName={session.email}>
      <div className="space-y-6">
        {reviewShifts.length ? (
          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-soft">
            <h1 className="text-2xl font-bold text-slate-950">مناوبات تحتاج مراجعة</h1>
            <div className="mt-5 space-y-4">
              {reviewShifts.map((shift: ShiftRecord) => (
                <div key={shift.id} className="rounded-[1.5rem] border border-amber-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <h2 className="text-lg font-bold text-slate-950">
                        {workerName(workers, shift.workerId)} - {formatShiftType(shift.shiftType)}
                      </h2>
                      <p className="text-sm text-slate-500">تم تمييزها للمراجعة في {formatDateTime(shift.review?.flaggedAt ?? shift.updatedAt)}</p>
                      <p className="text-sm text-slate-600">
                        الرصيد المتوقع: {formatCurrency(shift.review?.expectedShopCash ?? 0)} للمحل و{" "}
                        {formatCurrency(shift.review?.expectedFlexyCash ?? 0)} للفليكسي
                      </p>
                    </div>
                    {!shift.review?.resolvedAt ? <ResolveShiftReviewButton shiftId={shift.id} /> : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <InfoCard label="تركها العامل" value={workerName(workers, shift.workerId)} />
                    <InfoCard
                      label="استلم بعدها"
                      value={shift.review?.flaggedByWorkerId ? workerName(workers, shift.review.flaggedByWorkerId) : "غير معروف"}
                    />
                    <InfoCard
                      label="حالة المراجعة"
                      value={shift.review?.resolvedAt ? "تمت المراجعة" : "بانتظار المراجعة"}
                    />
                    <InfoCard label="وقت الفتح" value={formatDateTime(shift.opening.openedAt)} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-2xl font-bold text-slate-950">سجل المناوبات</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-right">العامل</th>
                  <th className="px-4 py-3 text-right">المناوبة</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                  <th className="px-4 py-3 text-right">البداية</th>
                  <th className="px-4 py-3 text-right">الإغلاق</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift: ShiftRecord) => (
                  <tr key={shift.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{workerName(workers, shift.workerId)}</td>
                    <td className="px-4 py-3">{formatShiftType(shift.shiftType)}</td>
                    <td className="px-4 py-3">{formatShiftStatus(shift.status)}</td>
                    <td className="px-4 py-3">{formatDateTime(shift.opening.openedAt)}</td>
                    <td className="px-4 py-3">{shift.closing ? formatDateTime(shift.closing.countedAt) : "غير مغلقة"}</td>
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-slate-950">{value}</p>
    </div>
  );
}
