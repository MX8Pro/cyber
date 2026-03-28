import { z } from "zod";
import { parseJson, jsonError, jsonOk } from "@/lib/server/http";
import { requireRoleForApi } from "@/lib/server/session";
import { updateTransactionForAdmin } from "@/lib/server/repositories";
import { writeAuditLog } from "@/lib/server/audit";

const adminTransactionUpdateSchema = z.object({
  amount: z.coerce.number().min(0, "المبلغ غير صحيح").optional(),
  description: z.string().trim().max(300, "الوصف طويل جدًا").optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ transactionId: string }> }) {
  try {
    const session = await requireRoleForApi("admin");
    const { transactionId } = await params;
    const input = await parseJson(request, adminTransactionUpdateSchema);

    const transaction = await updateTransactionForAdmin(transactionId, input);
    await writeAuditLog({
      actor: session,
      entityType: "transaction",
      entityId: transactionId,
      action: "transaction_updated_by_admin",
      metadata: {
        amount: transaction.amount,
        description: transaction.description
      }
    });

    return jsonOk({ transaction });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تعديل العملية", 400);
  }
}
