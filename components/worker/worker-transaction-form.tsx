"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-state";
import { submitWorkerMutation } from "@/components/worker/worker-action-helpers";
import { updateWorkerDashboardCache } from "@/offline/worker-cache";
import { transactionSchema, type TransactionFormValues } from "@/lib/validators/transaction";
import type { TransactionRecord } from "@/types";

export function WorkerTransactionForm({
  workerId,
  shiftId
}: {
  workerId: string;
  shiftId: string;
}) {
  const router = useRouter();
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      shiftId,
      workerId,
      type: "shop_deposit",
      treasury: "shop",
      amount: 0,
      description: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const createdAt = new Date().toISOString();
      const result = await submitWorkerMutation({
        workerId,
        action: "create_transaction",
        payload: values,
        endpoint: "/api/worker/transactions"
      });

      const serverTransaction = !result.queued ? ((result.data as { transaction?: TransactionRecord } | null)?.transaction ?? null) : null;
      const nextTransaction: TransactionRecord =
        serverTransaction ??
        {
          id: result.clientMutationId,
          shiftId,
          workerId,
          workerAuthUid: "offline-worker",
          type: values.type,
          treasury: values.treasury,
          amount: values.amount,
          description: values.description,
          createdAt,
          syncStatus: result.queued ? "pending" : "synced"
        };

      await updateWorkerDashboardCache(workerId, (snapshot) => {
        if (!snapshot) {
          return snapshot;
        }

        const activeShiftTransactions = [nextTransaction, ...(snapshot.activeShiftTransactions ?? [])];
        const recentTransactions = [nextTransaction, ...(snapshot.recentTransactions ?? [])].slice(0, 5);

        return {
          ...snapshot,
          activeShiftTransactions,
          recentTransactions,
          updatedAt: createdAt
        };
      });

      toast.success(result.queued ? "تم حفظ العملية محليًا وسيتم رفعها عند عودة الإنترنت" : "تم تسجيل العملية");
      router.replace("/worker/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تسجيل العملية");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <section className="rounded-[1.75rem] bg-white p-5 shadow-soft">
        <label className="field-label">نوع العملية</label>
        <select className="field-input" {...form.register("type")}>
          <option value="shop_deposit">إضافة أموال للمحل</option>
          <option value="shop_withdrawal">سحب أموال من المحل</option>
          <option value="flexy_deposit">إضافة أموال للفليكسي</option>
          <option value="flexy_withdrawal">سحب أموال من الفليكسي</option>
          <option value="expense">مصروف</option>
          <option value="correction">تصحيح</option>
          <option value="variance">فرق</option>
          <option value="note">ملاحظة</option>
        </select>
      </section>

      <section className="rounded-[1.75rem] bg-white p-5 shadow-soft">
        <label className="field-label">الخزينة</label>
        <select className="field-input" {...form.register("treasury")}>
          <option value="shop">المحل</option>
          <option value="flexy">الفليكسي</option>
        </select>
      </section>

      <section className="rounded-[1.75rem] bg-white p-5 shadow-soft">
        <label className="field-label">المبلغ</label>
        <input type="number" className="field-input" {...form.register("amount")} />
      </section>

      <section className="rounded-[1.75rem] bg-white p-5 shadow-soft">
        <label className="field-label">ملاحظة</label>
        <textarea className="field-input min-h-24" {...form.register("description")} />
      </section>

      <LoadingButton type="submit" loading={form.formState.isSubmitting} loadingText="جارٍ حفظ العملية..." className="w-full py-4 text-base">
        حفظ العملية
      </LoadingButton>
    </form>
  );
}
