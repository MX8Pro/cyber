import { z } from "zod";

const optionalDescription = z
  .string()
  .trim()
  .max(250, "الوصف طويل جدًا")
  .optional()
  .transform((value) => (value && value.length ? value : undefined));

const optionalClientMutationId = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length ? value : undefined))
  .refine((value) => !value || z.string().uuid().safeParse(value).success, "معرف المزامنة غير صالح");

export const transactionSchema = z.object({
  shiftId: z.string().uuid("معرف المناوبة غير صالح"),
  workerId: z.string().uuid("معرف العامل غير صالح"),
  type: z.enum([
    "shop_deposit",
    "shop_withdrawal",
    "flexy_deposit",
    "flexy_withdrawal",
    "expense",
    "correction",
    "note",
    "variance"
  ]),
  treasury: z.enum(["shop", "flexy"]),
  amount: z.coerce.number().min(0, "المبلغ غير صحيح"),
  description: optionalDescription,
  clientMutationId: optionalClientMutationId
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
