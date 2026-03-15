import { openShiftSchema } from "@/lib/validators/shift";
import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { requireRoleForApi } from "@/lib/server/session";
import {
  findWorkerById,
  getShiftOpeningContext,
  openShiftForWorker,
  updateWorkerLastShift
} from "@/lib/server/repositories";
import { writeAuditLog } from "@/lib/server/audit";
import { formatTelegramMessage, formatTelegramMoney, sendConfiguredTelegramNotification } from "@/lib/server/telegram";

export async function POST(request: Request) {
  try {
    const session = await requireRoleForApi("worker");
    const input = await parseJson(request, openShiftSchema);

    if (session.workerId !== input.workerId) {
      return jsonError("غير مصرح بفتح مناوبة باسم عامل آخر", 403);
    }

    const worker = await findWorkerById(session.workerId);
    if (!worker || worker.authUid !== session.uid || !worker.isActive || worker.deletedAt) {
      return jsonError("العامل غير متاح", 403);
    }

    const openingContext = await getShiftOpeningContext();
    const shift = await openShiftForWorker({
      session,
      worker,
      previousWorkerId: input.previousWorkerId,
      openingShopCash: input.openingShopCash,
      openingFlexyCash: input.openingFlexyCash,
      notes: input.notes,
      clientMutationId: input.clientMutationId
    });

    await updateWorkerLastShift(worker.id);
    await writeAuditLog({
      actor: session,
      entityType: "shift",
      entityId: shift.id,
      action: "shift_opened",
      metadata: {
        previousShiftId: shift.opening.previousShiftId,
        previousShiftStatus: shift.opening.previousShiftStatus,
        handoverIsEstimated: shift.opening.handoverIsEstimated
      }
    });

    await sendConfiguredTelegramNotification(
      "shift_opened",
      formatTelegramMessage([
        "تم استلام مناوبة جديدة",
        `العامل: ${worker.displayName}`,
        `النوع: ${shift.shiftType}`,
        `أموال المحل: ${formatTelegramMoney(shift.opening.openingShopCash)}`,
        `أموال الفليكسي: ${formatTelegramMoney(shift.opening.openingFlexyCash)}`,
        `الوقت: ${new Date(shift.opening.openedAt).toLocaleString("fr-FR")}`
      ])
    ).catch((error) => {
      console.error("shift opened telegram notification failed", error);
    });

    if (openingContext.hasOpenConflict) {
      await sendConfiguredTelegramNotification(
        "variance_alert",
        formatTelegramMessage([
          "تنبيه مناوبة متروكة بدون إغلاق",
          `العامل السابق: ${openingContext.previousWorkerName ?? openingContext.previousWorkerId ?? "غير معروف"}`,
          `العامل الحالي: ${worker.displayName}`,
          `المحل المتوقع: ${formatTelegramMoney(openingContext.handoverShopCash ?? 0)}`,
          `الفليكسي المتوقع: ${formatTelegramMoney(openingContext.handoverFlexyCash ?? 0)}`,
          "تم فتح مناوبة جديدة وتحويل السابقة إلى مراجعة"
        ])
      ).catch((error) => {
        console.error("open shift conflict telegram notification failed", error);
      });
    }

    return jsonOk({ shift });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر فتح المناوبة", 400);
  }
}
