"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-state";
import { formatDateTime } from "@/lib/utils/format";
import type { WorkerRecord } from "@/types";

async function readApiError(response: Response, fallbackMessage: string) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallbackMessage;
}

export function WorkersTable({ workers }: { workers: WorkerRecord[] }) {
  const router = useRouter();
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>({});
  const [pendingActionByWorker, setPendingActionByWorker] = useState<Record<string, string | null>>({});

  async function withPending(workerId: string, action: string, task: () => Promise<void>) {
    setPendingActionByWorker((current) => ({ ...current, [workerId]: action }));
    try {
      await task();
    } finally {
      setPendingActionByWorker((current) => ({ ...current, [workerId]: null }));
    }
  }

  async function toggleActive(worker: WorkerRecord) {
    await withPending(worker.id, "toggle", async () => {
      const response = await fetch(`/api/admin/workers/${worker.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !worker.isActive })
      });

      if (!response.ok) {
        toast.error(await readApiError(response, "تعذر تحديث حالة العامل"));
        return;
      }

      toast.success("تم تحديث حالة العامل");
      router.refresh();
    });
  }

  async function resetPassword(worker: WorkerRecord) {
    const newPassword = passwordInputs[worker.id]?.trim();
    if (!newPassword) {
      toast.error("أدخل كلمة السر الجديدة أولًا");
      return;
    }

    await withPending(worker.id, "password", async () => {
      const response = await fetch(`/api/admin/workers/${worker.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword })
      });

      if (!response.ok) {
        toast.error(await readApiError(response, "تعذر إعادة تعيين كلمة السر"));
        return;
      }

      toast.success("تمت إعادة تعيين كلمة السر");
      setPasswordInputs((current) => ({ ...current, [worker.id]: "" }));
    });
  }

  async function softDelete(worker: WorkerRecord) {
    await withPending(worker.id, "delete", async () => {
      const response = await fetch(`/api/admin/workers/${worker.id}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        toast.error(await readApiError(response, "تعذر حذف العامل منطقيًا"));
        return;
      }

      toast.success("تم حذف العامل منطقيًا");
      router.refresh();
    });
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
      <h2 className="text-xl font-bold text-slate-950">قائمة العمال</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {workers.map((worker) => {
          const pending = pendingActionByWorker[worker.id];

          return (
            <div
              key={worker.id}
              className="rounded-[1.5rem] border border-slate-200 p-5 transition hover:border-slate-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{worker.displayName}</h3>
                  <p className="text-sm text-slate-500">{worker.fullName}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    worker.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {worker.deletedAt ? "محذوف منطقيًا" : worker.isActive ? "نشط" : "معطل"}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <p>آخر دخول: {worker.lastLoginAt ? formatDateTime(worker.lastLoginAt) : "لا يوجد"}</p>
                <p>آخر مناوبة: {worker.lastShiftAt ? formatDateTime(worker.lastShiftAt) : "لا يوجد"}</p>
                <p>الدور: {worker.role}</p>
              </div>

              <div className="mt-4 space-y-2">
                <input
                  type="password"
                  className="field-input"
                  placeholder="كلمة سر جديدة"
                  value={passwordInputs[worker.id] ?? ""}
                  onChange={(event) =>
                    setPasswordInputs((current) => ({ ...current, [worker.id]: event.target.value }))
                  }
                />

                <div className="flex flex-wrap gap-2">
                  <LoadingButton
                    type="button"
                    variant="secondary"
                    loading={pending === "toggle"}
                    loadingText={worker.isActive ? "جارٍ التعطيل..." : "جارٍ التفعيل..."}
                    onClick={() => toggleActive(worker)}
                  >
                    {worker.isActive ? "تعطيل" : "تفعيل"}
                  </LoadingButton>

                  <LoadingButton
                    type="button"
                    variant="secondary"
                    loading={pending === "password"}
                    loadingText="جارٍ التحديث..."
                    onClick={() => resetPassword(worker)}
                  >
                    إعادة تعيين كلمة السر
                  </LoadingButton>

                  <LoadingButton
                    type="button"
                    variant="danger"
                    loading={pending === "delete"}
                    loadingText="جارٍ الحذف..."
                    className="text-sm"
                    onClick={() => softDelete(worker)}
                  >
                    حذف منطقي
                  </LoadingButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
