"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-state";
import { telegramSettingsSchema, type TelegramSettingsInput } from "@/lib/validators/telegram-settings";
import type { TelegramSettingsView } from "@/types";

const options = [
  { id: "worker_login", label: "دخول العامل" },
  { id: "shift_opened", label: "استلام المناوبة" },
  { id: "shift_closed", label: "إغلاق المناوبة" },
  { id: "variance_alert", label: "الفروقات" },
  { id: "large_expense", label: "المصاريف الكبيرة" },
  { id: "sync_issue", label: "مشاكل المزامنة" },
  { id: "profit_summary", label: "ملخص الفائدة" }
] as const;

export function TelegramSettingsForm({ settings }: { settings: TelegramSettingsView }) {
  const [message, setMessage] = useState("رسالة اختبار آمنة من لوحة الأدمن");
  const [isTesting, setIsTesting] = useState(false);
  const form = useForm<TelegramSettingsInput>({
    resolver: zodResolver(telegramSettingsSchema),
    defaultValues: {
      botToken: "",
      chatId: settings.chatId,
      enabled: settings.enabled,
      notifications: settings.notifications
    }
  });

  const watchedEnabled = form.watch("enabled");
  const watchedChatId = form.watch("chatId");
  const watchedBotToken = form.watch("botToken");
  const watchedNotifications = form.watch("notifications");
  const canTest =
    watchedEnabled &&
    Boolean((watchedChatId ?? "").trim()) &&
    Boolean(settings.botTokenMasked || (watchedBotToken ?? "").trim());

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      botToken: values.botToken?.trim() || undefined,
      chatId: values.chatId.trim()
    };

    const response = await fetch("/api/admin/settings/telegram", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ?? "تعذر حفظ إعدادات Telegram");
      return;
    }

    toast.success("تم حفظ إعدادات Telegram");
  });

  async function sendTest() {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      toast.error("أدخل رسالة اختبار أولًا");
      return;
    }

    if (!canTest) {
      toast.error("أكمل Bot Token وChat ID وفعّل Telegram ثم احفظ الإعدادات قبل الاختبار");
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch("/api/admin/settings/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: trimmedMessage })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "فشل اختبار الإرسال");
        return;
      }

      toast.success("تم إرسال رسالة الاختبار");
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Bot Token المحفوظ</p>
        <p className="mt-2 font-mono text-sm text-slate-900">{settings.botTokenMasked ?? "غير مضبوط بعد"}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Bot Token جديد</label>
          <input
            type="password"
            className="field-input"
            dir="ltr"
            placeholder="اتركه فارغًا إذا لم يتغير"
            {...form.register("botToken")}
          />
        </div>
        <div>
          <label className="field-label">Chat ID</label>
          <input className="field-input" dir="ltr" {...form.register("chatId")} />
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
        <input type="checkbox" {...form.register("enabled")} />
        <span className="text-sm font-medium">تفعيل إشعارات Telegram</span>
      </label>

      <div>
        <p className="field-label">أنواع الإشعارات</p>
        <div className="grid gap-3 md:grid-cols-2">
          {options.map((option) => {
            const selected = watchedNotifications.includes(option.id);
            return (
              <button
                type="button"
                key={option.id}
                className={`rounded-2xl border px-4 py-3 text-sm transition ${
                  selected
                    ? "border-brand bg-teal-50 text-teal-900"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() => {
                  const current = form.getValues("notifications");
                  const next = current.includes(option.id)
                    ? current.filter((item) => item !== option.id)
                    : [...current, option.id];
                  form.setValue("notifications", next, { shouldValidate: true });
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 p-4">
        <label className="field-label">رسالة الاختبار</label>
        <textarea className="field-input min-h-24" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <LoadingButton type="submit" loading={form.formState.isSubmitting} loadingText="جارٍ حفظ الإعدادات...">
          حفظ الإعدادات
        </LoadingButton>
        <LoadingButton
          type="button"
          variant="secondary"
          loading={isTesting}
          loadingText="جارٍ إرسال الاختبار..."
          onClick={sendTest}
          disabled={!canTest}
        >
          اختبار الإرسال
        </LoadingButton>
      </div>
    </form>
  );
}
