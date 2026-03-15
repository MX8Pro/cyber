"use client";

import { deleteOfflineMutation, listOfflineMutations, putOfflineMutation } from "@/offline/db";
import { emitWorkerOfflineEvent } from "@/offline/events";
import type { OfflineMutation } from "@/types";

export async function queueOfflineMutation(mutation: OfflineMutation) {
  const result = await putOfflineMutation(mutation);
  emitWorkerOfflineEvent(mutation.workerId);
  return result;
}

export async function syncOfflineMutations(workerId: string) {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0 };
  }

  const items = await listOfflineMutations(workerId);
  if (!items.length) {
    return { synced: 0 };
  }

  const response = await fetch("/api/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ items })
  });

  if (!response.ok) {
    throw new Error("SYNC_FAILED");
  }

  for (const item of items) {
    await deleteOfflineMutation(item.id);
  }

  emitWorkerOfflineEvent(workerId);
  return { synced: items.length };
}
