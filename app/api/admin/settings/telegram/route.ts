import { telegramSettingsSchema } from "@/lib/validators/telegram-settings";
import { parseJson, jsonError, jsonOk } from "@/lib/server/http";
import { requireRoleForApi } from "@/lib/server/session";
import { getTelegramSettingsView, updateTelegramSettings } from "@/lib/server/repositories";
import { writeAuditLog } from "@/lib/server/audit";

export async function GET() {
  try {
    await requireRoleForApi("admin");
    const telegram = await getTelegramSettingsView();
    return jsonOk({ telegram });
  } catch {
    return jsonError("غير مصرح", 403);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireRoleForApi("admin");
    const input = await parseJson(request, telegramSettingsSchema);
    await updateTelegramSettings({
      ...input,
      botToken: typeof input.botToken === "string" ? input.botToken : undefined
    });
    await writeAuditLog({
      actor: session,
      entityType: "telegram",
      entityId: "telegram",
      action: "telegram_settings_updated"
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر حفظ إعدادات Telegram", 400);
  }
}
