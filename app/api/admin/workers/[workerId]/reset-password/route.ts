import { workerPasswordResetSchema } from "@/lib/validators/worker-management";
import { parseJson, jsonError, jsonOk } from "@/lib/server/http";
import { requireRoleForApi } from "@/lib/server/session";
import { resetWorkerPassword } from "@/lib/server/repositories";
import { writeAuditLog } from "@/lib/server/audit";

export async function POST(request: Request, { params }: { params: Promise<{ workerId: string }> }) {
  try {
    const session = await requireRoleForApi("admin");
    const { workerId } = await params;
    const input = await parseJson(request, workerPasswordResetSchema);
    await resetWorkerPassword(workerId, input.newPassword);
    await writeAuditLog({
      actor: session,
      entityType: "worker",
      entityId: workerId,
      action: "worker_password_reset"
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر إعادة تعيين كلمة السر", 400);
  }
}
