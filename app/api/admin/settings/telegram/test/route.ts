import { telegramTestSchema } from "@/lib/validators/telegram-settings";
import { parseJson, jsonError, jsonOk } from "@/lib/server/http";
import { requireRoleForApi } from "@/lib/server/session";
import { getAppSettings, getTelegramBotToken } from "@/lib/server/repositories";
import { writeAuditLog } from "@/lib/server/audit";
import { headers } from "next/headers";
import { assertRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  try {
    const hdrs = await headers();
    assertRateLimit(`telegram-test:${hdrs.get("x-forwarded-for") ?? "local"}`, 10, 60_000);
    const session = await requireRoleForApi("admin");
    const input = await parseJson(request, telegramTestSchema);
    const settings = await getAppSettings();
    const token = await getTelegramBotToken();

    if (!token || !settings.telegram.chatId || !settings.telegram.enabled) {
      return jsonError("إعدادات Telegram غير مكتملة", 400);
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: settings.telegram.chatId,
        text: input.message
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      return jsonError("فشل إرسال رسالة الاختبار", 502);
    }

    await writeAuditLog({
      actor: session,
      entityType: "telegram",
      entityId: "telegram",
      action: "telegram_test_sent"
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر اختبار Telegram", 400);
  }
}
