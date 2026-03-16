import { closeShiftSchema } from "@/lib/validators/shift";
import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { requireRoleForApi } from "@/lib/server/session";
import { closeShiftForWorker, findWorkerById, getShiftWithTransactions } from "@/lib/server/repositories";
import { writeAuditLog } from "@/lib/server/audit";
import { formatTelegramMoney, sendConfiguredTelegramNotification, buildTelegramNotification } from "@/lib/server/telegram";

export async function POST(request: Request, { params }: { params: Promise<{ shiftId: string }> }) {
  try {
    const session = await requireRoleForApi("worker");
    const { shiftId } = await params;
    const input = await parseJson(request, closeShiftSchema);
    if (input.shiftId && input.shiftId !== shiftId) {
      return jsonError("معرف المناوبة غير مطابق لمسار الإغلاق", 400);
    }
    const worker = await findWorkerById(session.workerId!);
    if (!worker || worker.authUid !== session.uid) {
      return jsonError("العامل غير متاح", 403);
    }

    const bundle = await getShiftWithTransactions(shiftId, worker.id);
    if (!bundle || bundle.shift.status !== "open") {
      return jsonError("المناوبة غير متاحة للإغلاق", 409);
    }

    const summary = await closeShiftForWorker({
      session,
      worker,
      shift: bundle.shift,
      closingShopCash: input.closingShopCash,
      closingFlexyCash: input.closingFlexyCash,
      notes: input.notes,
      nextWorkerId: input.nextWorkerId,
      clientMutationId: input.clientMutationId
    });

    await writeAuditLog({
      actor: session,
      entityType: "shift",
      entityId: shiftId,
      action: "shift_closed",
      metadata: { netProfit: summary.netProfit }
    });
    const closingMessage = buildTelegramNotification({
      title: "تم إغلاق المناوبة",
      level: "info",
      lines: [
        `العامل: ${worker.displayName}`,
        `المحل النهائي: ${formatTelegramMoney(summary.closingShopCash)}`,
        `الفليكسي النهائي: ${formatTelegramMoney(summary.closingFlexyCash)}`,
        `فرق المحل: ${formatTelegramMoney(summary.deltaShopCash)}`,
        `فرق الفليكسي: ${formatTelegramMoney(summary.deltaFlexyCash)}`,
        `الفائدة الصافية: ${formatTelegramMoney(summary.netProfit)}`,
        `حصة العامل: ${formatTelegramMoney(summary.workerProfitShare)}`,
        `حصة المحل: ${formatTelegramMoney(summary.shopProfitShare)}`
      ]
    });

    await Promise.allSettled([
      sendConfiguredTelegramNotification("shift_closed", closingMessage),
      sendConfiguredTelegramNotification("profit_summary", closingMessage)
    ]);

    return jsonOk({ summary });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر إغلاق المناوبة", 400);
  }
}
