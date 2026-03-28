import { jsonError, jsonOk } from "@/lib/server/http";
import { requireRoleForApi } from "@/lib/server/session";
import { resetSystemDataForDeployment } from "@/lib/server/repositories";
import { writeAuditLog } from "@/lib/server/audit";

export async function POST() {
  try {
    const session = await requireRoleForApi("admin");
    await writeAuditLog({
      actor: session,
      entityType: "setup",
      entityId: "system",
      action: "system_reset_requested"
    });

    await resetSystemDataForDeployment();
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تنفيذ إعادة الضبط", 400);
  }
}
