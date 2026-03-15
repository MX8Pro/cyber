"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-state";
import { bootstrapAdminSchema, type BootstrapAdminInput } from "@/lib/validators/auth";

export function SetupAdminForm() {
  const router = useRouter();
  const form = useForm<BootstrapAdminInput>({
    resolver: zodResolver(bootstrapAdminSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      setupSecret: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      setupSecret: values.setupSecret.trim()
    };

    const response = await fetch("/api/setup/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include"
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ?? "تعذر إنشاء أول مسؤول");
      return;
    }

    toast.success("تم إنشاء أول مسؤول وتهيئة النظام");
    router.replace("/admin/dashboard");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="panel w-full max-w-lg space-y-4 p-6">
      <div>
        <label className="field-label">الاسم الكامل</label>
        <input className="field-input" {...form.register("fullName")} />
      </div>
      <div>
        <label className="field-label">البريد الإلكتروني</label>
        <input className="field-input" dir="ltr" {...form.register("email")} />
      </div>
      <div>
        <label className="field-label">كلمة السر</label>
        <input type="password" className="field-input" dir="ltr" {...form.register("password")} />
        <p className="mt-2 text-xs text-slate-500">اختر كلمة سر قوية بطول 10 أحرف على الأقل.</p>
      </div>
      <div>
        <label className="field-label">رمز التهيئة الأولية</label>
        <input type="password" className="field-input" dir="ltr" {...form.register("setupSecret")} />
        <p className="mt-2 text-xs leading-6 text-slate-500">
          أدخل القيمة نفسها الموجودة في <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">SETUP_SECRET</span>
          {" "}داخل ملف <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">.env.local</span>.
        </p>
      </div>
      <LoadingButton
        type="submit"
        loading={form.formState.isSubmitting}
        loadingText="جارٍ إنشاء المسؤول..."
        className="w-full"
      >
        إنشاء أول مسؤول
      </LoadingButton>
    </form>
  );
}
