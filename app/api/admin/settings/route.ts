import { profitSettingsSchema } from "@/lib/validators/settings";
import { parseJson, jsonError, jsonOk } from "@/lib/server/http";
import { requireRoleForApi } from "@/lib/server/session";
import { getAppSettings, updateProfitSettings } from "@/lib/server/repositories";
import { writeAuditLog } from "@/lib/server/audit";

export async function GET() {
  try {
    await requireRoleForApi("admin");
    const settings = await getAppSettings();
    return jsonOk({ settings });
  } catch {
    return jsonError("غير مصرح", 403);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireRoleForApi("admin");
    const input = await parseJson(request, profitSettingsSchema);
    await updateProfitSettings(input);
    await writeAuditLog({
      actor: session,
      entityType: "settings",
      entityId: "app",
      action: "profit_settings_updated"
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تحديث الإعدادات", 400);
  }
}
