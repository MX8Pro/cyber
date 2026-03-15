"use client";

import { queueOfflineMutation } from "@/offline/sync-queue";
import { createRuntimeId } from "@/lib/utils/runtime-id";
import type { OfflineMutation, SyncActionType } from "@/types";

function withClientMutationId<T>(payload: T, clientMutationId: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  return {
    ...(payload as Record<string, unknown>),
    clientMutationId
  } as T;
}

export async function submitWorkerMutation<T>({
  workerId,
  action,
  payload,
  endpoint
}: {
  workerId: string;
  action: SyncActionType;
  payload: T;
  endpoint: string;
}): Promise<
  | { queued: true; clientMutationId: string; payload: T }
  | { queued: false; data: unknown; clientMutationId: string; payload: T }
> {
  const clientMutationId = createRuntimeId();
  const payloadWithMutationId = withClientMutationId(payload, clientMutationId);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const queued: OfflineMutation = {
      id: clientMutationId,
      clientMutationId,
      workerId,
      action,
      payload: payloadWithMutationId,
      createdAt: new Date().toISOString(),
      retries: 0
    };
    await queueOfflineMutation(queued);
    return { queued: true as const, clientMutationId, payload: payloadWithMutationId };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payloadWithMutationId)
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "REQUEST_FAILED");
  }

  const data = (await response.json().catch(() => null)) as unknown;
  return { queued: false as const, data, clientMutationId, payload: payloadWithMutationId };
}
