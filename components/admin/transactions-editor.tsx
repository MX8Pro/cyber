"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-state";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { TransactionRecord, WorkerRecord } from "@/types";

export function TransactionsEditor({
  transactions,
  workers
}: {
  transactions: TransactionRecord[];
  workers: WorkerRecord[];
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { amount: number; description: string }>>(() =>
    Object.fromEntries(transactions.map((item) => [item.id, { amount: item.amount, description: item.description ?? "" }]))
  );

  const workerName = (workerId: string) => workers.find((worker) => worker.id === workerId)?.displayName ?? workerId;

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
      <h2 className="text-xl font-bold text-slate-950">تعديل العمليات عند الخطأ</h2>
      <p className="mt-1 text-sm text-slate-500">يمكن تعديل المبلغ والوصف لأي عملية، وسيُسجل ذلك تلقائيًا في Audit Log.</p>

      <div className="mt-4 space-y-3">
        {transactions.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
              <span>{workerName(item.workerId)}</span>
              <span>{formatDateTime(item.createdAt)}</span>
            </div>

            <div className="grid gap-3 md:grid-cols-[160px_1fr_auto] md:items-end">
              <div>
                <label className="field-label">المبلغ</label>
                <input
                  type="number"
                  className="field-input"
                  value={edits[item.id]?.amount ?? item.amount}
                  onChange={(event) =>
                    setEdits((current) => ({
                      ...current,
                      [item.id]: {
                        ...(current[item.id] ?? { amount: item.amount, description: item.description ?? "" }),
                        amount: Number(event.target.value || 0)
                      }
                    }))
                  }
                />
              </div>

              <div>
                <label className="field-label">الوصف</label>
                <input
                  className="field-input"
                  value={edits[item.id]?.description ?? item.description ?? ""}
                  onChange={(event) =>
                    setEdits((current) => ({
                      ...current,
                      [item.id]: {
                        ...(current[item.id] ?? { amount: item.amount, description: item.description ?? "" }),
                        description: event.target.value
                      }
                    }))
                  }
                />
              </div>

              <LoadingButton
                type="button"
                loading={pendingId === item.id}
                loadingText="جارٍ الحفظ..."
                className="h-11"
                onClick={async () => {
                  const edit = edits[item.id] ?? { amount: item.amount, description: item.description ?? "" };
                  setPendingId(item.id);
                  try {
                    const response = await fetch(`/api/admin/transactions/${item.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ amount: edit.amount, description: edit.description })
                    });

                    if (!response.ok) {
                      const data = (await response.json().catch(() => null)) as { error?: string } | null;
                      toast.error(data?.error ?? "تعذر تعديل العملية");
                      return;
                    }

                    toast.success(`تم تعديل العملية (${formatCurrency(edit.amount)})`);
                  } finally {
                    setPendingId(null);
                  }
                }}
              >
                حفظ
              </LoadingButton>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
