"use client";

import {
  OFFLINE_BROWSER_ID_KEY,
  OFFLINE_SESSION_KEY,
  clearOfflineWorkerSession,
  getOfflineMeta,
  getOfflineWorkerSession,
  getTrustedWorkerDevice,
  listTrustedWorkerDevices,
  putOfflineMeta,
  putOfflineWorkerSession,
  putTrustedWorkerDevice
} from "@/offline/db";
import { emitWorkerAuthEvent } from "@/offline/events";
import { createRuntimeId } from "@/lib/utils/runtime-id";
import type {
  OfflineWorkerSession,
  TrustedWorkerDevicePayload,
  TrustedWorkerDeviceRecord,
  WorkerListItem
} from "@/types";

function pickLatestTrustedRecords(records: TrustedWorkerDeviceRecord[]) {
  const byWorker = new Map<string, TrustedWorkerDeviceRecord>();

  for (const record of records) {
    const current = byWorker.get(record.workerId);
    if (!current || new Date(record.lastActivatedAt).getTime() > new Date(current.lastActivatedAt).getTime()) {
      byWorker.set(record.workerId, record);
    }
  }

  return Array.from(byWorker.values());
}

export async function getOrCreateBrowserId() {
  const existing = await getOfflineMeta<string>(OFFLINE_BROWSER_ID_KEY);
  if (existing) {
    return existing;
  }

  const browserId = createRuntimeId();
  await putOfflineMeta(OFFLINE_BROWSER_ID_KEY, browserId);
  return browserId;
}

function buildOfflineSession(input: {
  workerId: string;
  displayName: string;
  color?: string;
  icon?: string;
  payload: TrustedWorkerDevicePayload;
  activatedAt: string;
}): OfflineWorkerSession {
  return {
    id: OFFLINE_SESSION_KEY,
    workerId: input.workerId,
    displayName: input.displayName,
    color: input.color,
    icon: input.icon,
    deviceId: input.payload.deviceId,
    browserId: input.payload.browserId,
    deviceSecret: input.payload.deviceSecret,
    activatedAt: input.activatedAt,
    expiresAt: input.payload.expiresAt,
    lastUnlockedAt: new Date().toISOString()
  };
}

export async function activateOfflineSessionFromTrustedDevice(input: {
  worker: WorkerListItem;
  payload: TrustedWorkerDevicePayload;
  activatedAt?: string;
}) {
  const session = buildOfflineSession({
    workerId: input.worker.id,
    displayName: input.worker.displayName,
    color: input.worker.color,
    icon: input.worker.icon,
    payload: input.payload,
    activatedAt: input.activatedAt ?? new Date().toISOString()
  });

  await putOfflineWorkerSession(session);
  emitWorkerAuthEvent(input.worker.id);
  return session;
}

export async function registerTrustedWorkerDevice(input: {
  worker: WorkerListItem;
  payload: TrustedWorkerDevicePayload;
  password: string;
}) {
  const localRecord: TrustedWorkerDeviceRecord = {
    id: input.payload.deviceId,
    workerId: input.worker.id,
    displayName: input.worker.displayName,
    color: input.worker.color,
    icon: input.worker.icon,
    browserId: input.payload.browserId,
    expiresAt: input.payload.expiresAt,
    lastActivatedAt: new Date().toISOString(),
    plainPayload: input.payload,
    plainPassword: input.password
  };

  await putTrustedWorkerDevice(localRecord);
  return localRecord;
}

export async function listOfflineTrustedWorkers() {
  return listTrustedWorkerDevices();
}

export async function getOfflineTrustedWorkerList(): Promise<WorkerListItem[]> {
  const records = pickLatestTrustedRecords(await listOfflineTrustedWorkers());
  return records.map((record) => ({
    id: record.workerId,
    displayName: record.displayName,
    color: record.color,
    icon: record.icon
  }));
}

export async function unlockOfflineWorkerSession(workerId: string, _password: string) {
  const trustedDevices = (await listOfflineTrustedWorkers())
    .filter((item) => item.workerId === workerId)
    .sort((left, right) => new Date(right.lastActivatedAt).getTime() - new Date(left.lastActivatedAt).getTime());

  if (!trustedDevices.length) {
    throw new Error("هذا العامل غير مفعّل محليًا على هذا المتصفح. ادخل مرة واحدة بالإنترنت فقط.");
  }

  const record = trustedDevices[0];
  const payload = record.plainPayload;

  if (!payload || payload.workerId !== workerId || payload.deviceId !== record.id) {
    throw new Error("بيانات التفعيل المحلي غير مكتملة على هذا المتصفح. ادخل مرة واحدة بالإنترنت لإعادة حفظها.");
  }

  const session = buildOfflineSession({
    workerId,
    displayName: record.displayName,
    color: record.color,
    icon: record.icon,
    payload,
    activatedAt: record.lastActivatedAt
  });

  await putOfflineWorkerSession(session);
  emitWorkerAuthEvent(workerId);
  return session;
}

export async function getCurrentOfflineWorkerSession() {
  const session = await getOfflineWorkerSession();
  if (!session) {
    return null;
  }

  const deviceRecord = await getTrustedWorkerDevice(session.deviceId);
  if (!deviceRecord || deviceRecord.workerId !== session.workerId) {
    await clearCurrentOfflineWorkerSession();
    return null;
  }

  return session;
}

export async function clearCurrentOfflineWorkerSession() {
  await clearOfflineWorkerSession();
  emitWorkerAuthEvent();
}

export async function restoreServerSessionFromOfflineSession(session: OfflineWorkerSession) {
  const response = await fetch("/api/auth/worker/restore-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({
      workerId: session.workerId,
      deviceId: session.deviceId,
      browserId: session.browserId,
      deviceSecret: session.deviceSecret
    })
  });

  if (!response.ok) {
    throw new Error("تعذر استرجاع جلسة الخادم من الجهاز الموثوق.");
  }

  emitWorkerAuthEvent(session.workerId);
  return response.json().catch(() => null);
}
