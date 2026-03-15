import { z } from "zod";

const normalizedOptionalSecret = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().min(1, "أدخل Bot Token").optional());

export const telegramSettingsSchema = z.object({
  botToken: normalizedOptionalSecret,
  chatId: z.string().trim().min(1, "أدخل Chat ID"),
  enabled: z.boolean(),
  notifications: z.array(
    z.enum([
      "worker_login",
      "shift_opened",
      "shift_closed",
      "variance_alert",
      "large_expense",
      "sync_issue",
      "profit_summary"
    ])
  )
});

export const telegramTestSchema = z.object({
  message: z.string().trim().min(3, "رسالة الاختبار قصيرة جدًا")
});

export type TelegramSettingsInput = z.infer<typeof telegramSettingsSchema>;
export type TelegramTestInput = z.infer<typeof telegramTestSchema>;
