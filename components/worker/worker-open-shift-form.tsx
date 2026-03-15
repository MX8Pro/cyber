"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-state";
import { submitWorkerMutation } from "@/components/worker/worker-action-helpers";
import { updateWorkerDashboardCache } from "@/offline/worker-cache";
import { formatCurrency, formatShiftStatus, formatShiftType } from "@/lib/utils/format";
import { openShiftSchema, type OpenShiftFormValues } from "@/lib/validators/shift";
import type { ShiftOpeningContext, ShiftRecord } from "@/types";

export function WorkerOpenShiftForm({
  workerId,
  openingContext
}: {
  workerId: string;
  openingContext: ShiftOpeningContext;
}) {
  const router = useRouter();
  const form = useForm<OpenShiftFormValues>({
    resolver: zodResolver(openShiftSchema),
    defaultValues: {
      workerId,
      previousWorkerId: openingContext.previousWorkerId,
      openingShopCash: openingContext.handoverShopCash ?? 0,
      openingFlexyCash: openingContext.handoverFlexyCash ?? 0,
      notes: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const openedAt = new Date().toISOString();
      const result = await submitWorkerMutation({
        workerId,
        action: "open_shift",
        payload: values,
        endpoint: "/api/worker/shifts/open"
      });

      const serverShift = !result.queued ? ((result.data as { shift?: ShiftRecord } | null)?.shift ?? null) : null;

      await updateWorkerDashboardCache(workerId, (snapshot) => {
        if (!snapshot) {
          return snapshot;
        }

        const nextShift: ShiftRecord =
          serverShift ??
          {
            id: result.clientMutationId,
            workerId,
            workerAuthUid: "offline-worker",
            shiftType: openingContext.suggestedShiftType,
            status: "open",
            opening: {
              previousWorkerId: values.previousWorkerId,
              previousShiftId: openingContext.previousShiftId,
              previousShiftStatus: openingContext.previousShiftStatus,
              handoverShopCash: openingContext.handoverShopCash,
              handoverFlexyCash: openingContext.handoverFlexyCash,
              handoverIsEstimated: openingContext.handoverIsEstimated,
              openingShopCash: values.openingShopCash,
              openingFlexyCash: values.openingFlexyCash,
              openedAt,
              notes: values.notes
            },
            syncStatus: result.queued ? "pending" : "synced",
            createdAt: openedAt,
            updatedAt: openedAt
          };

        return {
          ...snapshot,
          activeShift: nextShift,
          activeShiftTransactions: [],
          recentTransactions: [],
          openingContext: null,
          updatedAt: openedAt
        };
      });

      toast.success(result.queued ? "تم حفظ استلام المناوبة محليًا وسيتم رفعه عند عودة الإنترنت" : "تم فتح المناوبة");
      router.replace("/worker/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر فتح المناوبة");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" {...form.register("workerId")} />
      <input type="hidden" {...form.register("previousWorkerId")} />

      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-soft">
        <p className="text-sm text-slate-300">الفترة المحددة تلقائيًا</p>
        <h2 className="mt-2 text-2xl font-bold">{formatShiftType(openingContext.suggestedShiftType)}</h2>
        <p className="mt-2 text-sm text-slate-300">يعتمد التحديد على الوقت الحالي وإعدادات الأدمن.</p>
      </section>

      {openingContext.previousShiftId ? (
        <section
          className={`rounded-[1.75rem] p-5 shadow-soft ${
            openingContext.hasOpenConflict ? "border border-amber-200 bg-amber-50" : "bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">آخر عامل قبلك</p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">{openingContext.previousWorkerName ?? "غير معروف"}</h3>
              <p className="mt-1 text-sm text-slate-500">الحالة السابقة: {formatShiftStatus(openingContext.previousShiftStatus ?? "open")}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                openingContext.handoverIsEstimated ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {openingContext.handoverIsEstimated ? "رصيد تقديري" : "رصيد مؤكد"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard label="ما تركه في المحل" value={formatCurrency(openingContext.handoverShopCash ?? 0)} />
            <InfoCard label="ما تركه في الفليكسي" value={formatCurrency(openingContext.handoverFlexyCash ?? 0)} />
          </div>

          {openingContext.hasOpenConflict ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm leading-7 text-amber-900">
              العامل السابق ترك مناوبة مفتوحة. سيسمح لك النظام بالبدء الآن، وسيحوّل المناوبة السابقة إلى مراجعة مع تنبيه فوري للإدارة.
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-[1.75rem] bg-white p-5 shadow-soft">
        <label className="field-label">أموال المحل التي وجدتها</label>
        <input type="number" className="field-input" {...form.register("openingShopCash")} />
      </section>

      <section className="rounded-[1.75rem] bg-white p-5 shadow-soft">
        <label className="field-label">أموال الفليكسي التي وجدتها</label>
        <input type="number" className="field-input" {...form.register("openingFlexyCash")} />
      </section>

      <section className="rounded-[1.75rem] bg-white p-5 shadow-soft">
        <label className="field-label">ملاحظات</label>
        <textarea className="field-input min-h-24" {...form.register("notes")} />
      </section>

      <LoadingButton type="submit" loading={form.formState.isSubmitting} loadingText="جارٍ تأكيد الاستلام..." className="w-full py-4 text-base">
        تأكيد استلام المناوبة
      </LoadingButton>
    </form>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}
