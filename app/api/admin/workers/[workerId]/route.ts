import { workerUpdateSchema } from "@/lib/validators/worker-management";
import { parseJson, jsonError, jsonOk } from "@/lib/server/http";
import { requireRoleForApi } from "@/lib/server/session";
import { softDeleteWorker, updateWorkerAccount } from "@/lib/server/repositories";
import { writeAuditLog } from "@/lib/server/audit";

export async function PATCH(request: Request, { params }: { params: Promise<{ workerId: string }> }) {
  try {
    const session = await requireRoleForApi("admin");
    const { workerId } = await params;
    const input = await parseJson(request, workerUpdateSchema);
    await updateWorkerAccount(workerId, input);
    await writeAuditLog({
      actor: session,
      entityType: "worker",
      entityId: workerId,
      action: "worker_updated"
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تحديث العامل", 400);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ workerId: string }> }) {
  try {
    const session = await requireRoleForApi("admin");
    const { workerId } = await params;
    await softDeleteWorker(workerId);
    await writeAuditLog({
      actor: session,
      entityType: "worker",
      entityId: workerId,
      action: "worker_soft_deleted"
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر حذف العامل", 400);
  }
}
