"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Palette, Phone, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-state";
import { cn } from "@/lib/utils/cn";
import { workerCreateSchema, type WorkerCreateInput } from "@/lib/validators/worker-management";

const colorPresets = [
  { name: "فيروزي", value: "#0f766e" },
  { name: "أزرق", value: "#1d4ed8" },
  { name: "كهرماني", value: "#d97706" },
  { name: "وردي", value: "#e11d48" },
  { name: "بنفسجي", value: "#7c3aed" },
  { name: "فحمي", value: "#1f2937" }
] as const;

const iconPresets = ["A", "M", "S", "K", "R", "N"] as const;

export function WorkerManagementForm() {
  const router = useRouter();
  const form = useForm<WorkerCreateInput>({
    resolver: zodResolver(workerCreateSchema),
    defaultValues: {
      fullName: "",
      displayName: "",
      password: "",
      color: colorPresets[0].value,
      icon: iconPresets[0],
      phone: "",
      notes: ""
    }
  });

  const preview = useMemo(
    () => ({
      fullName: form.watch("fullName") || "اسم العامل الكامل",
      displayName: form.watch("displayName") || "اسم العرض",
      color: form.watch("color") || colorPresets[0].value,
      icon: (form.watch("icon") || iconPresets[0]).slice(0, 2),
      phone: form.watch("phone") || "رقم الهاتف اختياري",
      notes: form.watch("notes") || "يمكنك كتابة ملاحظات تشغيلية داخل هذا الحقل."
    }),
    [form]
  );

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      fullName: values.fullName.trim(),
      displayName: values.displayName.trim(),
      password: values.password,
      color: values.color?.trim() || undefined,
      icon: values.icon?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      notes: values.notes?.trim() || undefined
    };

    const response = await fetch("/api/admin/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ?? "تعذر إنشاء العامل");
      return;
    }

    toast.success("تم إنشاء العامل بنجاح");
    form.reset({
      fullName: "",
      displayName: "",
      password: "",
      color: colorPresets[0].value,
      icon: iconPresets[0],
      phone: "",
      notes: ""
    });
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="glass-panel rise-in overflow-hidden p-5">
      <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#0f172a_0%,#134e4a_100%)] p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-4 w-4" />
              <span>إنشاء حساب عامل</span>
            </div>
            <h2 className="text-2xl font-bold">بطاقة واضحة وسريعة لإضافة عامل جديد</h2>
            <p className="text-sm leading-7 text-slate-200">
              عيّن الاسم، كلمة السر الأولية، والهوية البصرية للعامل من مكان واحد منظم.
            </p>
          </div>
          <div
            className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] text-xl font-bold text-white soft-ring"
            style={{ backgroundColor: preview.color }}
          >
            {preview.icon}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-sm font-semibold text-slate-700">المعاينة المباشرة</p>
        <div className="mt-3 flex items-center gap-4 rounded-[1.5rem] bg-white p-4 soft-ring">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] text-lg font-bold text-white"
            style={{ backgroundColor: preview.color }}
          >
            {preview.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-slate-950">{preview.displayName}</p>
            <p className="truncate text-sm text-slate-500">{preview.fullName}</p>
            <p className="mt-1 truncate text-xs text-slate-400">{preview.phone}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <UserRound className="h-4 w-4 text-brand" />
            <h3 className="font-semibold">بيانات العامل</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="field-label">الاسم الكامل</label>
              <input className="field-input" placeholder="مثال: محمد الأمين" {...form.register("fullName")} />
            </div>
            <div>
              <label className="field-label">اسم العرض</label>
              <input className="field-input" placeholder="مثال: محمد" {...form.register("displayName")} />
            </div>
            <div>
              <label className="field-label">كلمة السر الأولية</label>
              <input type="password" className="field-input" placeholder="8 أحرف على الأقل" {...form.register("password")} />
            </div>
            <div>
              <label className="field-label">رقم الهاتف</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="field-input pr-11" placeholder="اختياري" {...form.register("phone")} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <Palette className="h-4 w-4 text-brand" />
            <h3 className="font-semibold">الهوية البصرية</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="field-label">اختر لونًا سريعًا</label>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((preset) => {
                  const selected = form.watch("color") === preset.value;
                  return (
                    <button
                      type="button"
                      key={preset.value}
                      onClick={() => form.setValue("color", preset.value, { shouldValidate: true })}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition",
                        selected ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.value }} />
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="field-label">قيمة اللون</label>
                <input className="field-input" dir="ltr" {...form.register("color")} />
              </div>
              <div>
                <label className="field-label">رمز الأيقونة</label>
                <input className="field-input" dir="ltr" maxLength={2} {...form.register("icon")} />
              </div>
            </div>

            <div>
              <label className="field-label">أيقونات سريعة</label>
              <div className="flex flex-wrap gap-2">
                {iconPresets.map((icon) => {
                  const selected = form.watch("icon") === icon;
                  return (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => form.setValue("icon", icon, { shouldValidate: true })}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-bold transition",
                        selected ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {icon}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <ShieldCheck className="h-4 w-4 text-brand" />
            <h3 className="font-semibold">ملاحظات الإدارة</h3>
          </div>
          <label className="field-label">ملاحظات داخلية</label>
          <textarea className="field-input min-h-28" placeholder="مثال: يفضل المناوبة الصباحية" {...form.register("notes")} />
        </section>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-[1.5rem] bg-slate-50 px-4 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">جاهز لإنشاء الحساب</p>
          <p className="text-xs leading-6 text-slate-500">سيتم إنشاء حساب Firebase وربطه بالعامل تلقائيًا من الخادم.</p>
        </div>
        <LoadingButton
          type="submit"
          loading={form.formState.isSubmitting}
          loadingText="جارٍ إنشاء العامل..."
          className="min-w-[170px]"
        >
          إضافة عامل جديد
        </LoadingButton>
      </div>
    </form>
  );
}
