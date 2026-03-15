import { transactionSchema } from "@/lib/validators/transaction";
import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { requireRoleForApi } from "@/lib/server/session";
import { createTransactionForWorker, findWorkerById, getActiveShiftForWorker, getAppSettings } from "@/lib/server/repositories";
import { writeAuditLog } from "@/lib/server/audit";
import { formatTelegramMessage, formatTelegramMoney, sendConfiguredTelegramNotification } from "@/lib/server/telegram";

export async function POST(request: Request) {
  try {
    const session = await requireRoleForApi("worker");
    const input = await parseJson(request, transactionSchema);
    if (session.workerId !== input.workerId) {
      return jsonError("غير مصرح بإنشاء عملية باسم عامل آخر", 403);
    }

    const worker = await findWorkerById(session.workerId);
    if (!worker || worker.authUid !== session.uid) {
      return jsonError("العامل غير متاح", 403);
    }

    const shift = await getActiveShiftForWorker(worker.id);
    if (!shift || shift.id !== input.shiftId) {
      return jsonError("المناوبة غير متاحة", 409);
    }

    const transaction = await createTransactionForWorker({
      session,
      worker,
      shift,
      type: input.type,
      treasury: input.treasury,
      amount: input.amount,
      description: input.description,
      clientMutationId: input.clientMutationId
    });

    await writeAuditLog({
      actor: session,
      entityType: "transaction",
      entityId: transaction.id,
      action: "transaction_created"
    });

    if (transaction.type === "expense") {
      const settings = await getAppSettings();
      if (transaction.amount >= settings.largeExpenseThreshold) {
        await sendConfiguredTelegramNotification(
          "large_expense",
          formatTelegramMessage([
            "تنبيه مصروف كبير",
            `العامل: ${worker.displayName}`,
            `المبلغ: ${formatTelegramMoney(transaction.amount)}`,
            `الخزينة: ${transaction.treasury === "shop" ? "المحل" : "الفليكسي"}`,
            `الملاحظة: ${transaction.description ?? "بدون ملاحظة"}`
          ])
        ).catch((error) => {
          console.error("large expense telegram notification failed", error);
        });
      }
    }

    return jsonOk({ transaction });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر حفظ العملية", 400);
  }
}
