"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-state";

const CONFIRM_TEXT = "RESET ALL";

export function SystemResetPanel() {
  const router = useRouter();
  const [confirmValue, setConfirmValue] = useState("");
  const [isPending, setIsPending] = useState(false);

  const canRun = confirmValue.trim().toUpperCase() === CONFIRM_TEXT;

  return (
    <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-soft">
      <h2 className="text-xl font-bold text-rose-900">إعادة ضبط كاملة قبل النشر</h2>
      <p className="mt-2 text-sm leading-7 text-rose-800">
        هذا الإجراء سيحذف كل بيانات التجارب: العمال، المناوبات، العمليات، سجلات التدقيق، إعدادات النظام، وحتى حسابات Firebase Auth.
      </p>
      <p className="mt-2 text-sm font-semibold text-rose-900">اكتب <span dir="ltr">{CONFIRM_TEXT}</span> للتأكيد النهائي.</p>

      <input
        value={confirmValue}
        onChange={(event) => setConfirmValue(event.target.value)}
        className="field-input mt-3"
        dir="ltr"
        placeholder={CONFIRM_TEXT}
      />

      <div className="mt-4">
        <LoadingButton
          type="button"
          loading={isPending}
          loadingText="جارٍ حذف البيانات..."
          disabled={!canRun}
          className="bg-rose-600 text-white hover:bg-rose-700"
          onClick={async () => {
            setIsPending(true);
            try {
              const response = await fetch("/api/admin/system/reset-all", {
                method: "POST",
                credentials: "include"
              });

              if (!response.ok) {
                const data = (await response.json().catch(() => null)) as { error?: string } | null;
                toast.error(data?.error ?? "فشلت إعادة الضبط");
                return;
              }

              toast.success("تمت إعادة الضبط بالكامل. سيتم تحويلك إلى صفحة الإعداد.");
              router.replace("/setup");
              router.refresh();
            } finally {
              setIsPending(false);
            }
          }}
        >
          حذف كل البيانات والحسابات
        </LoadingButton>
      </div>
    </section>
  );
}
