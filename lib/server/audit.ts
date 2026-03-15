import { randomUUID } from "node:crypto";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { nowIso } from "@/lib/server/firestore-helpers";
import type { AuditLogRecord, SessionUser } from "@/types";

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, nestedValue]) => [key, stripUndefined(nestedValue)])
        .filter(([, nestedValue]) => nestedValue !== undefined)
    );
  }

  return value === undefined ? undefined : value;
}

export async function writeAuditLog(input: {
  actor: SessionUser;
  entityType: AuditLogRecord["entityType"];
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  const sanitizedMetadata = input.metadata ? (stripUndefined(input.metadata) as Record<string, unknown>) : undefined;

  const log: AuditLogRecord = {
    id: randomUUID(),
    actorUid: input.actor.uid,
    actorRole: input.actor.role,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    createdAt: nowIso(),
    ...(sanitizedMetadata ? { metadata: sanitizedMetadata } : {})
  };

  await getAdminDb().collection("auditLogs").doc(log.id).set(log);
}
