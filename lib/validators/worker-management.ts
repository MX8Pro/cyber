import { z } from "zod";

export const workerCreateSchema = z.object({
  fullName: z.string().min(3, "الاسم الكامل مطلوب"),
  displayName: z.string().min(2, "اسم العرض مطلوب"),
  password: z.string().min(8, "كلمة السر يجب أن تكون 8 أحرف على الأقل"),
  color: z.string().max(20).optional(),
  icon: z.string().max(40).optional(),
  phone: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
  creditBalance: z.coerce.number().min(0).max(1_000_000_000).optional()
});

export const workerUpdateSchema = z.object({
  fullName: z.string().min(3).optional(),
  displayName: z.string().min(2).optional(),
  color: z.string().max(20).optional(),
  icon: z.string().max(40).optional(),
  phone: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
  creditBalance: z.coerce.number().min(0).max(1_000_000_000).optional(),
  isActive: z.boolean().optional()
});

export const workerPasswordResetSchema = z.object({
  newPassword: z.string().min(8, "كلمة السر الجديدة قصيرة جدًا")
});

export type WorkerCreateInput = z.infer<typeof workerCreateSchema>;
export type WorkerUpdateInput = z.infer<typeof workerUpdateSchema>;
export type WorkerPasswordResetInput = z.infer<typeof workerPasswordResetSchema>;
