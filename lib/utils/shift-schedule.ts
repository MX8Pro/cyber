import type { ShiftScheduleSettings, ShiftType } from "@/types";

export const DEFAULT_SHIFT_SCHEDULE: ShiftScheduleSettings = {
  timezone: "Africa/Algiers",
  morningStart: "06:00",
  eveningStart: "14:00",
  nightStart: "22:00"
};

function parseTimeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map((part) => Number(part));
  return hour * 60 + minute;
}

function getMinutesInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function getShiftTypeForDate(date: Date, schedule: ShiftScheduleSettings): ShiftType {
  const currentMinutes = getMinutesInTimeZone(date, schedule.timezone);
  const morningStart = parseTimeToMinutes(schedule.morningStart);
  const eveningStart = parseTimeToMinutes(schedule.eveningStart);
  const nightStart = parseTimeToMinutes(schedule.nightStart);

  if (currentMinutes >= morningStart && currentMinutes < eveningStart) {
    return "morning";
  }

  if (currentMinutes >= eveningStart && currentMinutes < nightStart) {
    return "evening";
  }

  return "night";
}
