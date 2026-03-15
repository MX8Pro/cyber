import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().trim().email("أدخل بريدًا صحيحًا"),
  password: z.string().min(8, "كلمة السر قصيرة جدًا")
});

export const workerLoginSchema = z.object({
  workerId: z.string().uuid("اختر عاملًا صحيحًا"),
  password: z.string().min(8, "كلمة السر مطلوبة"),
  browserId: z.string().uuid("معرف الجهاز غير صالح").optional()
});

export const restoreWorkerSessionSchema = z.object({
  workerId: z.string().uuid("معرف العامل غير صالح"),
  deviceId: z.string().min(10, "معرف الجهاز غير صالح"),
  browserId: z.string().uuid("معرف المتصفح غير صالح"),
  deviceSecret: z.string().min(20, "رمز الجهاز غير صالح")
});

export const bootstrapAdminSchema = z.object({
  fullName: z.string().trim().min(3, "الاسم الكامل مطلوب"),
  email: z.string().trim().email("أدخل بريدًا صحيحًا"),
  password: z.string().min(10, "كلمة السر يجب أن تكون أقوى"),
  setupSecret: z.string().trim().min(1, "رمز التهيئة الأولية مطلوب")
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type WorkerLoginInput = z.infer<typeof workerLoginSchema>;
export type RestoreWorkerSessionInput = z.infer<typeof restoreWorkerSessionSchema>;
export type BootstrapAdminInput = z.infer<typeof bootstrapAdminSchema>;
