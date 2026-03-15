"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-state";
import { adminLoginSchema, type AdminLoginInput } from "@/lib/validators/auth";

export function AdminLoginForm() {
  const router = useRouter();
  const form = useForm<AdminLoginInput>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const response = await fetch("/api/auth/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: values.email.trim(),
        password: values.password
      })
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ?? "تعذر تسجيل الدخول");
      return;
    }

    toast.success("تم تسجيل دخول المسؤول");
    router.replace("/admin/dashboard");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="panel surface-glow w-full max-w-md space-y-4 p-6">
      <div>
        <label className="field-label">البريد الإلكتروني</label>
        <input className="field-input" dir="ltr" {...form.register("email")} />
      </div>
      <div>
        <label className="field-label">كلمة السر</label>
        <input type="password" className="field-input" dir="ltr" {...form.register("password")} />
      </div>
      <LoadingButton
        type="submit"
        loading={form.formState.isSubmitting}
        loadingText="جارٍ تسجيل الدخول..."
        className="w-full py-4 text-base"
      >
        دخول الأدمن
      </LoadingButton>
    </form>
  );
}
