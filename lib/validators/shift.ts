import { z } from "zod";

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length ? value : undefined))
  .refine((value) => !value || z.string().uuid().safeParse(value).success, "المعرف غير صالح");

const optionalNotes = z
  .string()
  .trim()
  .max(250, "الملاحظات طويلة جدًا")
  .optional()
  .transform((value) => (value && value.length ? value : undefined));

export const openShiftSchema = z.object({
  workerId: z.string().uuid("معرف العامل غير صالح"),
  previousWorkerId: optionalUuid,
  openingShopCash: z.coerce.number().min(0, "قيمة أموال المحل غير صحيحة"),
  openingFlexyCash: z.coerce.number().min(0, "قيمة أموال الفليكسي غير صحيحة"),
  notes: optionalNotes,
  clientMutationId: optionalUuid
});

export const closeShiftSchema = z.object({
  shiftId: optionalUuid,
  closingShopCash: z.coerce.number().min(0, "القيمة النهائية للمحل غير صحيحة"),
  closingFlexyCash: z.coerce.number().min(0, "القيمة النهائية للفليكسي غير صحيحة"),
  nextWorkerId: optionalUuid,
  notes: optionalNotes,
  clientMutationId: optionalUuid
});

export type OpenShiftFormValues = z.infer<typeof openShiftSchema>;
export type CloseShiftFormValues = z.infer<typeof closeShiftSchema>;
