"use client";

import { OFFLINE_GLOBAL_SCOPE, deleteOfflineCache, getOfflineCache, putOfflineCache } from "@/offline/db";
import { emitWorkerOfflineEvent } from "@/offline/events";
import type { WorkerDashboardSnapshot, WorkerListItem } from "@/types";

const workerDashboardKey = (workerId: string) => `worker-dashboard:${workerId}`;
const workerListKey = "worker-login-list";

export async function saveWorkerLoginListCache(workers: WorkerListItem[]) {
  await putOfflineCache(workerListKey, OFFLINE_GLOBAL_SCOPE, workers);
}

export async function getWorkerLoginListCache() {
  return getOfflineCache<WorkerListItem[]>(workerListKey);
}

export async function saveWorkerDashboardCache(snapshot: WorkerDashboardSnapshot) {
  await putOfflineCache(workerDashboardKey(snapshot.workerId), snapshot.workerId, snapshot);
  emitWorkerOfflineEvent(snapshot.workerId);
}

export async function getWorkerDashboardCache(workerId: string) {
  return getOfflineCache<WorkerDashboardSnapshot>(workerDashboardKey(workerId));
}

export async function clearWorkerDashboardCache(workerId: string) {
  await deleteOfflineCache(workerDashboardKey(workerId));
  emitWorkerOfflineEvent(workerId);
}

export async function updateWorkerDashboardCache(
  workerId: string,
  updater: (snapshot: WorkerDashboardSnapshot | null) => WorkerDashboardSnapshot | null
) {
  const current = await getWorkerDashboardCache(workerId);
  const next = updater(current);

  if (!next) {
    await clearWorkerDashboardCache(workerId);
    return null;
  }

  await saveWorkerDashboardCache(next);
  return next;
}
