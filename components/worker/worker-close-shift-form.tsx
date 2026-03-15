"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-state";
import { submitWorkerMutation } from "@/components/worker/worker-action-helpers";
import { updateWorkerDashboardCache } from "@/offline/worker-cache";
import { formatCurrency } from "@/lib/utils/format";
import { calculateProfitSummary } from "@/lib/utils/profit";
import { closeShiftSchema, type CloseShiftFormValues } from "@/lib/validators/shift";
import type { AppSettingsRecord, ShiftRecord, TransactionRecord } from "@/types";

export function WorkerCloseShiftForm({
  workerId,
  shift,
  transactions,
  settings
}: {
  workerId: string;
  shift: ShiftRecord;
  transactions: TransactionRecord[];
  settings: AppSettingsRecord;
}) {
  const router = useRouter();
  const form = useForm<CloseShiftFormValues>({
    resolver: zodResolver(closeShiftSchema),
    defaultValues: {
      shiftId: shift.id,
      closingShopCash: shift.opening.openingShopCash,
      closingFlexyCash: shift.opening.openingFlexyCash,
      nextWorkerId: undefined,
      notes: ""
    }
  });

  const watchedShopCash = form.watch("closingShopCash");
  const watchedFlexyCash = form.watch("closingFlexyCash");

  const preview = useMemo(
    () =>
      calculateProfitSummary({
        openingShopCash: shift.opening.openingShopCash,
        openingFlexyCash: shift.opening.openingFlexyCash,
        closingShopCash: Number(watchedShopCash || 0),
        closingFlexyCash: Number(watchedFlexyCash || 0),
        transactions,
        settings
      }),
    [settings, shift, transactions, watchedFlexyCash, watchedShopCash]
  );

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const countedAt = new Date().toISOString();
      const result = await submitWorkerMutation({
        workerId,
        action: "close_shift",
        payload: values,
        endpoint: `/api/worker/shifts/${shift.id}/close`
      });

      await updateWorkerDashboardCache(workerId, (snapshot) => {
        if (!snapshot) {
          return snapshot;
        }

        return {
          ...snapshot,
          activeShift: null,
          activeShiftTransactions: [],
          openingContext: {
            suggestedShiftType: shift.shiftType,
            previousWorkerId: workerId,
            previousWorkerName: snapshot.worker.displayName,
            previousShiftId: shift.id,
            previousShiftStatus: "closed",
            handoverShopCash: values.closingShopCash,
            handoverFlexyCash: values.closingFlexyCash,
            handoverIsEstimated: false,
            hasOpenConflict: false
          },
          updatedAt: countedAt
        };
      });

      toast.success(result.queued ? "تم حفظ إغلاق المناوبة محليًا وسيتم رفعه عند عودة الإنترنت" : "تم إغلاق المناوبة");
      router.replace("/worker/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إغلاق المناوبة");
    }
  });

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold text-slate-900">الرصيد الذي وجدته في البداية</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <InfoCard label="أموال المحل" value={formatCurrency(shift.opening.openingShopCash)} />
          <InfoCard label="أموال الفليكسي" value={formatCurrency(shift.opening.openingFlexyCash)} />
        </div>
      </section>

      <form onSubmit={onSubmit} className="space-y-4">
        <section className="rounded-[1.75rem] bg-white p-5 shadow-soft">
          <label className="field-label">الموجود الآن في المحل</label>
          <input type="number" className="field-input" {...form.register("closingShopCash")} />
        </section>

        <section className="rounded-[1.75rem] bg-white p-5 shadow-soft">
          <label className="field-label">الموجود الآن في الفليكسي</label>
          <input type="number" className="field-input" {...form.register("closingFlexyCash")} />
        </section>

        <section className="rounded-[1.75rem] border border-amber-100 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
          يتم احتساب الفائدة الصافية من فرق المحل فقط. فرق الفليكسي وأمواله الأصلية يظهران للمراجعة فقط ولا يدخلان في فائدة العامل.
        </section>

        <section className="rounded-[1.75rem] bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-5 text-white shadow-soft">
          <h2 className="text-lg font-bold">ملخص الفائدة</h2>
          <div className="mt-4 grid gap-3">
            <SummaryRow label="فرق المحل" value={preview.deltaShopCash} />
            <SummaryRow label="فرق الفليكسي" value={preview.deltaFlexyCash} />
            <SummaryRow label="أثر عمليات الفليكسي" value={preview.flexyTransactionsTotal} />
            <SummaryRow label="الفائدة الخام المعتمدة" value={preview.grossProfit} />
            <SummaryRow label="الفائدة الصافية" value={preview.netProfit} strong />
            <SummaryRow label="حصة العامل" value={preview.workerProfitShare} />
            <SummaryRow label="حصة المحل" value={preview.shopProfitShare} />
          </div>
        </section>

        <LoadingButton type="submit" loading={form.formState.isSubmitting} loadingText="جارٍ إغلاق المناوبة..." variant="danger" className="w-full rounded-[1.5rem] py-4 text-base">
          إغلاق المناوبة
        </LoadingButton>
      </form>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
      <span className="text-sm text-slate-200">{label}</span>
      <span className={strong ? "text-lg font-bold text-white" : "font-semibold text-white"}>{formatCurrency(value)}</span>
    </div>
  );
}
