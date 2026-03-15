"use client";

import {
  OFFLINE_BROWSER_ID_KEY,
  OFFLINE_SESSION_KEY,
  clearOfflineWorkerSession,
  deleteTrustedWorkerDevice,
  getOfflineMeta,
  getOfflineWorkerSession,
  getTrustedWorkerDevice,
  listTrustedWorkerDevices,
  putOfflineMeta,
  putOfflineWorkerSession,
  putTrustedWorkerDevice
} from "@/offline/db";
import { emitWorkerAuthEvent } from "@/offline/events";
import { decryptPayloadWithPassword } from "@/lib/utils/offline-crypto";
import { createRuntimeId } from "@/lib/utils/runtime-id";
import type {
  OfflineWorkerSession,
  TrustedWorkerDevicePayload,
  TrustedWorkerDeviceRecord,
  WorkerListItem
} from "@/types";

function isExpired(isoDate: string) {
  return new Date(isoDate).getTime() <= Date.now();
}

const INVISIBLE_PASSWORD_CHARS_REGEX = /[​-‏‪-‮⁦-⁩﻿]/g;
const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_INDIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function normalizePasswordForOffline(password: string) {
  let normalized = password.normalize("NFKC").replace(INVISIBLE_PASSWORD_CHARS_REGEX, "");

  normalized = normalized
    .split("")
    .map((char) => {
      const arabicIndex = ARABIC_INDIC_DIGITS.indexOf(char);
      if (arabicIndex >= 0) {
        return String(arabicIndex);
      }

      const extendedArabicIndex = EXTENDED_ARABIC_INDIC_DIGITS.indexOf(char);
      if (extendedArabicIndex >= 0) {
        return String(extendedArabicIndex);
      }

      return char;
    })
    .join("");

  return normalized;
}

function buildPasswordCandidates(password: string) {
  const normalizedPassword = normalizePasswordForOffline(password);
  const candidates = [password, password.trim(), normalizedPassword, normalizedPassword.trim()];

  return Array.from(new Set(candidates.filter(Boolean)));
}

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
  const records = await listTrustedWorkerDevices();
  const validRecords: TrustedWorkerDeviceRecord[] = [];

  for (const record of records) {
    if (isExpired(record.expiresAt)) {
      await deleteTrustedWorkerDevice(record.id);
      continue;
    }
    validRecords.push(record);
  }

  return validRecords;
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

export async function unlockOfflineWorkerSession(workerId: string, password: string) {
  const trustedDevices = (await listOfflineTrustedWorkers())
    .filter((item) => item.workerId === workerId)
    .sort((left, right) => new Date(right.lastActivatedAt).getTime() - new Date(left.lastActivatedAt).getTime());

  if (!trustedDevices.length) {
    throw new Error("هذا العامل غير مفعّل للعمل بدون إنترنت على هذا الجهاز.");
  }

  const passwordVariants = buildPasswordCandidates(password);

  for (const record of trustedDevices) {
    const storedPasswordCandidates = buildPasswordCandidates(record.plainPassword ?? "");
    const hasPlainPasswordMatch = passwordVariants.some((candidate) => storedPasswordCandidates.includes(candidate));

    const plainPayload = record.plainPayload;
    if (plainPayload && hasPlainPasswordMatch) {
      if (
        plainPayload.workerId === workerId &&
        plainPayload.deviceId === record.id &&
        !isExpired(plainPayload.expiresAt)
      ) {
        const session: OfflineWorkerSession = {
          id: OFFLINE_SESSION_KEY,
          workerId,
          displayName: record.displayName,
          color: record.color,
          icon: record.icon,
          deviceId: plainPayload.deviceId,
          browserId: plainPayload.browserId,
          deviceSecret: plainPayload.deviceSecret,
          activatedAt: record.lastActivatedAt,
          expiresAt: plainPayload.expiresAt,
          lastUnlockedAt: new Date().toISOString()
        };

        await putOfflineWorkerSession(session);
        emitWorkerAuthEvent(workerId);
        return session;
      }
    }

    if (!record.encryptedPayload) {
      continue;
    }

    for (const candidatePassword of passwordVariants) {
      const payload = await decryptPayloadWithPassword<TrustedWorkerDevicePayload>(record.encryptedPayload, candidatePassword).catch(
        () => null
      );

      if (!payload || payload.workerId !== workerId || payload.deviceId !== record.id || isExpired(payload.expiresAt)) {
        continue;
      }

      const session: OfflineWorkerSession = {
        id: OFFLINE_SESSION_KEY,
        workerId,
        displayName: record.displayName,
        color: record.color,
        icon: record.icon,
        deviceId: payload.deviceId,
        browserId: payload.browserId,
        deviceSecret: payload.deviceSecret,
        activatedAt: record.lastActivatedAt,
        expiresAt: payload.expiresAt,
        lastUnlockedAt: new Date().toISOString()
      };

      await putOfflineWorkerSession(session);
      emitWorkerAuthEvent(workerId);
      return session;
    }
  }

  throw new Error("تعذر فتح الدخول المحلي. كلمة السر غير مطابقة للتفعيل المحلي أو أن التفعيل منتهي. أدخل بالإنترنت مرة واحدة لإعادة التفعيل.");
}

export async function getCurrentOfflineWorkerSession() {
  const session = await getOfflineWorkerSession();
  if (!session) {
    return null;
  }

  if (isExpired(session.expiresAt)) {
    await clearCurrentOfflineWorkerSession();
    return null;
  }

  const deviceRecord = await getTrustedWorkerDevice(session.deviceId);
  if (!deviceRecord || deviceRecord.workerId !== session.workerId || isExpired(deviceRecord.expiresAt)) {
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
