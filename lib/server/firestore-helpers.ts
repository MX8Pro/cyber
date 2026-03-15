import { Timestamp } from "firebase-admin/firestore";

export function nowIso() {
  return new Date().toISOString();
}

export function serializeTimestamp(value: string | Timestamp | null | undefined): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}
