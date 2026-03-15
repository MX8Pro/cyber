import { z } from "zod";

const timeField = z.string().regex(/^\d{2}:\d{2}$/, "الوقت يجب أن يكون بصيغة HH:mm");

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export const profitSettingsSchema = z
  .object({
    workerProfitPercentage: z.number().min(0).max(100),
    shopProfitPercentage: z.number().min(0).max(100),
    profitCalculationMode: z.enum(["strict-flexy-separated", "basic-delta"]),
    roundProfitShares: z.boolean(),
    largeExpenseThreshold: z.number().min(0),
    shiftSchedule: z.object({
      timezone: z.string().trim().min(1, "أدخل المنطقة الزمنية"),
      morningStart: timeField,
      eveningStart: timeField,
      nightStart: timeField
    })
  })
  .refine((value) => value.workerProfitPercentage + value.shopProfitPercentage === 100, {
    message: "يجب أن يكون مجموع النسب 100%"
  })
  .refine(
    (value) =>
      toMinutes(value.shiftSchedule.morningStart) < toMinutes(value.shiftSchedule.eveningStart) &&
      toMinutes(value.shiftSchedule.eveningStart) < toMinutes(value.shiftSchedule.nightStart),
    {
      message: "يجب أن تكون فترات الصباح ثم المساء ثم الليل مرتبة زمنيًا"
    }
  );

export type ProfitSettingsInput = z.infer<typeof profitSettingsSchema>;
