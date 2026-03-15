import { z } from "zod";
import { closeShiftSchema, openShiftSchema } from "@/lib/validators/shift";
import { transactionSchema } from "@/lib/validators/transaction";
import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { requireRoleForApi } from "@/lib/server/session";
import {
  closeShiftForWorker,
  createTransactionForWorker,
  findWorkerById,
  getActiveShiftForWorker,
  getShiftWithTransactions,
  getSyncReceipt,
  openShiftForWorker,
  saveSyncReceipt
} from "@/lib/server/repositories";

const syncItemSchema = z.object({
  id: z.string(),
  clientMutationId: z.string().uuid(),
  workerId: z.string().uuid(),
  action: z.enum(["open_shift", "create_transaction", "close_shift"]),
  payload: z.unknown()
});

const syncSchema = z.object({
  items: z.array(syncItemSchema)
});

export async function POST(request: Request) {
  try {
    const session = await requireRoleForApi("worker");
    const input = await parseJson(request, syncSchema);

    for (const item of input.items) {
      if (item.workerId !== session.workerId) {
        return jsonError("تعذر مزامنة عنصر لا يخص العامل الحالي", 403);
      }

      const existingReceipt = await getSyncReceipt(item.clientMutationId);
      if (existingReceipt) {
        continue;
      }

      const worker = await findWorkerById(item.workerId);
      if (!worker || worker.authUid !== session.uid) {
        return jsonError("العامل غير متاح", 403);
      }

      if (item.action === "open_shift") {
        const payload = openShiftSchema.parse(item.payload);
        const shift = await openShiftForWorker({
          session,
          worker,
          previousWorkerId: payload.previousWorkerId,
          openingShopCash: payload.openingShopCash,
          openingFlexyCash: payload.openingFlexyCash,
          notes: payload.notes,
          clientMutationId: item.clientMutationId
        });

        await saveSyncReceipt({
          id: item.clientMutationId,
          workerId: worker.id,
          action: item.action,
          entityId: shift.id
        });
      }

      if (item.action === "create_transaction") {
        const payload = transactionSchema.parse(item.payload);
        const shift = await getActiveShiftForWorker(worker.id);
        if (!shift) {
          return jsonError("لا توجد مناوبة مفتوحة للعامل", 409);
        }

        const transaction = await createTransactionForWorker({
          session,
          worker,
          shift,
          type: payload.type,
          treasury: payload.treasury,
          amount: payload.amount,
          description: payload.description,
          clientMutationId: item.clientMutationId
        });

        await saveSyncReceipt({
          id: item.clientMutationId,
          workerId: worker.id,
          action: item.action,
          entityId: transaction.id
        });
      }

      if (item.action === "close_shift") {
        const payload = closeShiftSchema.parse(item.payload);
        if (!payload.shiftId) {
          return jsonError("معرف المناوبة مطلوب لإتمام الإغلاق", 409);
        }

        const shiftBundle = await getShiftWithTransactions(payload.shiftId, worker.id);
        if (!shiftBundle) {
          return jsonError("المناوبة غير متاحة للإغلاق", 409);
        }

        await closeShiftForWorker({
          session,
          worker,
          shift: shiftBundle.shift,
          closingShopCash: payload.closingShopCash,
          closingFlexyCash: payload.closingFlexyCash,
          notes: payload.notes,
          nextWorkerId: payload.nextWorkerId,
          clientMutationId: item.clientMutationId
        });

        await saveSyncReceipt({
          id: item.clientMutationId,
          workerId: worker.id,
          action: item.action,
          entityId: shiftBundle.shift.id
        });
      }
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر إتمام المزامنة", 400);
  }
}
