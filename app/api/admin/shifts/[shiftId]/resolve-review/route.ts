import { jsonError, jsonOk } from "@/lib/server/http";
import { writeAuditLog } from "@/lib/server/audit";
import { resolveShiftReview } from "@/lib/server/repositories";
import { requireRoleForApi } from "@/lib/server/session";

export async function POST(_: Request, { params }: { params: Promise<{ shiftId: string }> }) {
  try {
    const session = await requireRoleForApi("admin");
    const { shiftId } = await params;

    await resolveShiftReview(shiftId, session);
    await writeAuditLog({
      actor: session,
      entityType: "shift",
      entityId: shiftId,
      action: "shift_review_resolved"
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر إنهاء مراجعة المناوبة", 400);
  }
}
