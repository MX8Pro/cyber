"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-state";
import { profitSettingsSchema, type ProfitSettingsInput } from "@/lib/validators/settings";

export function ProfitSettingsForm({ values }: { values: ProfitSettingsInput }) {
  const form = useForm<ProfitSettingsInput>({
    resolver: zodResolver(profitSettingsSchema),
    defaultValues: values
  });

  const onSubmit = form.handleSubmit(async (payload) => {
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ?? "تعذر تحديث الإعدادات");
      return;
    }

    toast.success("تم حفظ إعدادات النظام");
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-2">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
        <label className="field-label">نسبة العامل</label>
        <input type="number" className="field-input" {...form.register("workerProfitPercentage", { valueAsNumber: true })} />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
        <label className="field-label">نسبة المحل</label>
        <input type="number" className="field-input" {...form.register("shopProfitPercentage", { valueAsNumber: true })} />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
        <label className="field-label">طريقة الحساب</label>
        <select className="field-input" {...form.register("profitCalculationMode")}>
          <option value="strict-flexy-separated">فصل صارم للفليكسي</option>
          <option value="basic-delta">فرق أساسي</option>
        </select>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
        <label className="field-label">حد المصروف الكبير</label>
        <input type="number" className="field-input" {...form.register("largeExpenseThreshold", { valueAsNumber: true })} />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft md:col-span-2">
        <h2 className="text-lg font-bold text-slate-950">جدول الفترات التلقائي</h2>
        <p className="mt-2 text-sm text-slate-500">سيحدد النظام المناوبة تلقائيًا حسب هذه الساعات.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div>
            <label className="field-label">المنطقة الزمنية</label>
            <input className="field-input" dir="ltr" {...form.register("shiftSchedule.timezone")} />
          </div>
          <div>
            <label className="field-label">بداية الصباح</label>
            <input type="time" className="field-input" {...form.register("shiftSchedule.morningStart")} />
          </div>
          <div>
            <label className="field-label">بداية المساء</label>
            <input type="time" className="field-input" {...form.register("shiftSchedule.eveningStart")} />
          </div>
          <div>
            <label className="field-label">بداية الليل</label>
            <input type="time" className="field-input" {...form.register("shiftSchedule.nightStart")} />
          </div>
        </div>
      </section>

      <label className="flex items-center gap-3 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft md:col-span-2">
        <input type="checkbox" {...form.register("roundProfitShares")} />
        <span>تقريب الحصص تلقائيًا</span>
      </label>

      <div className="md:col-span-2">
        <LoadingButton type="submit" loading={form.formState.isSubmitting} loadingText="جارٍ حفظ الإعدادات...">
          حفظ إعدادات النظام
        </LoadingButton>
      </div>
    </form>
  );
}
