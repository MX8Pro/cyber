import { workerCreateSchema } from "@/lib/validators/worker-management";
import { parseJson, jsonError, jsonOk } from "@/lib/server/http";
import { requireRoleForApi } from "@/lib/server/session";
import { createWorkerAccount, listWorkersForAdmin } from "@/lib/server/repositories";
import { writeAuditLog } from "@/lib/server/audit";

export async function GET() {
  try {
    await requireRoleForApi("admin");
    const workers = await listWorkersForAdmin();
    return jsonOk({ workers });
  } catch {
    return jsonError("غير مصرح", 403);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRoleForApi("admin");
    const input = await parseJson(request, workerCreateSchema);
    const worker = await createWorkerAccount(session, input);
    await writeAuditLog({
      actor: session,
      entityType: "worker",
      entityId: worker.id,
      action: "worker_created",
      metadata: { displayName: worker.displayName }
    });
    return jsonOk({ worker });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر إنشاء العامل", 400);
  }
}
