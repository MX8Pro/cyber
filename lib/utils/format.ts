import { format } from "date-fns";

export function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("ar-DZ").format(value)} دج`;
}

export function formatDateTime(value: string) {
  return format(new Date(value), "yyyy/MM/dd HH:mm");
}

export function formatShiftType(value: string) {
  switch (value) {
    case "morning":
      return "صباح";
    case "evening":
      return "مساء";
    case "night":
      return "ليل";
    default:
      return value;
  }
}

export function formatShiftStatus(value: string) {
  switch (value) {
    case "open":
      return "مفتوحة";
    case "closed":
      return "مغلقة";
    case "handed_over":
      return "تم تسليمها";
    case "needs_review":
      return "تحتاج مراجعة";
    default:
      return value;
  }
}
