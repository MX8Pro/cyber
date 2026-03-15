import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  OfflineCacheEntry,
  OfflineMetaEntry,
  OfflineMutation,
  OfflineWorkerSession,
  TrustedWorkerDeviceRecord
} from "@/types";

interface OfflineDb extends DBSchema {
  mutations: {
    key: string;
    value: OfflineMutation;
    indexes: {
      "by-worker": string;
    };
  };
  cache: {
    key: string;
    value: OfflineCacheEntry;
    indexes: {
      "by-worker": string;
    };
  };
  trustedDevices: {
    key: string;
    value: TrustedWorkerDeviceRecord;
    indexes: {
      "by-worker": string;
      "by-browser": string;
    };
  };
  sessions: {
    key: string;
    value: OfflineWorkerSession;
    indexes: {
      "by-worker": string;
    };
  };
  meta: {
    key: string;
    value: OfflineMetaEntry;
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineDb>> | null = null;
export const OFFLINE_GLOBAL_SCOPE = "__global__";
export const OFFLINE_SESSION_KEY = "current-worker-session";
export const OFFLINE_BROWSER_ID_KEY = "browser-id";

const LS_PREFIX = "cashier-offline-fallback";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getLocalStorageKey(scope: string) {
  return `${LS_PREFIX}:${scope}`;
}

function readLocalStorageScope<T>(scope: string) {
  if (!canUseLocalStorage()) {
    return {} as Record<string, T>;
  }

  const raw = window.localStorage.getItem(getLocalStorageKey(scope));
  if (!raw) {
    return {} as Record<string, T>;
  }

  try {
    return JSON.parse(raw) as Record<string, T>;
  } catch {
    return {} as Record<string, T>;
  }
}

function writeLocalStorageScope<T>(scope: string, value: Record<string, T>) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(getLocalStorageKey(scope), JSON.stringify(value));
}

function canUseIndexedDb() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

async function getDb() {
  if (!canUseIndexedDb()) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = openDB<OfflineDb>("cashier-secure-offline", 3, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("mutations")) {
          const store = db.createObjectStore("mutations", { keyPath: "id" });
          store.createIndex("by-worker", "workerId");
        }

        if (!db.objectStoreNames.contains("cache")) {
          const cacheStore = db.createObjectStore("cache", { keyPath: "key" });
          cacheStore.createIndex("by-worker", "workerId");
        }

        if (!db.objectStoreNames.contains("trustedDevices")) {
          const trustedStore = db.createObjectStore("trustedDevices", { keyPath: "id" });
          trustedStore.createIndex("by-worker", "workerId");
          trustedStore.createIndex("by-browser", "browserId");
        }

        if (!db.objectStoreNames.contains("sessions")) {
          const sessionsStore = db.createObjectStore("sessions", { keyPath: "id" });
          sessionsStore.createIndex("by-worker", "workerId");
        }

        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      }
    });
  }

  try {
    return await dbPromise;
  } catch {
    return null;
  }
}

export async function putOfflineMutation(mutation: OfflineMutation) {
  const db = await getDb();
  return db?.put("mutations", mutation);
}

export async function listOfflineMutations(workerId: string) {
  const db = await getDb();
  return db ? db.getAllFromIndex("mutations", "by-worker", workerId) : [];
}

export async function deleteOfflineMutation(id: string) {
  const db = await getDb();
  return db?.delete("mutations", id);
}

export async function countOfflineMutations(workerId: string) {
  const db = await getDb();
  return db ? db.countFromIndex("mutations", "by-worker", workerId) : 0;
}

export async function putOfflineCache<TValue>(key: string, workerId: string, value: TValue) {
  const db = await getDb();
  if (!db) {
    return;
  }

  return db.put("cache", {
    key,
    workerId,
    value,
    updatedAt: new Date().toISOString()
  });
}

export async function getOfflineCache<TValue>(key: string) {
  const db = await getDb();
  if (!db) {
    return null;
  }

  const record = await db.get("cache", key);
  return (record?.value as TValue | undefined) ?? null;
}

export async function deleteOfflineCache(key: string) {
  const db = await getDb();
  return db?.delete("cache", key);
}

export async function putTrustedWorkerDevice(record: TrustedWorkerDeviceRecord) {
  const db = await getDb();
  if (db) {
    return db.put("trustedDevices", record);
  }

  const bucket = readLocalStorageScope<TrustedWorkerDeviceRecord>("trustedDevices");
  bucket[record.id] = record;
  writeLocalStorageScope("trustedDevices", bucket);
}

export async function getTrustedWorkerDevice(id: string) {
  const db = await getDb();
  if (db) {
    return db.get("trustedDevices", id);
  }

  const bucket = readLocalStorageScope<TrustedWorkerDeviceRecord>("trustedDevices");
  return bucket[id] ?? null;
}

export async function listTrustedWorkerDevices() {
  const db = await getDb();
  if (db) {
    return db.getAll("trustedDevices");
  }

  return Object.values(readLocalStorageScope<TrustedWorkerDeviceRecord>("trustedDevices"));
}

export async function deleteTrustedWorkerDevice(id: string) {
  const db = await getDb();
  if (db) {
    return db.delete("trustedDevices", id);
  }

  const bucket = readLocalStorageScope<TrustedWorkerDeviceRecord>("trustedDevices");
  delete bucket[id];
  writeLocalStorageScope("trustedDevices", bucket);
}

export async function putOfflineWorkerSession(session: OfflineWorkerSession) {
  const db = await getDb();
  if (db) {
    return db.put("sessions", session);
  }

  const bucket = readLocalStorageScope<OfflineWorkerSession>("sessions");
  bucket[session.id] = session;
  writeLocalStorageScope("sessions", bucket);
}

export async function getOfflineWorkerSession(id = OFFLINE_SESSION_KEY) {
  const db = await getDb();
  if (db) {
    return db.get("sessions", id);
  }

  const bucket = readLocalStorageScope<OfflineWorkerSession>("sessions");
  return bucket[id] ?? null;
}

export async function clearOfflineWorkerSession(id = OFFLINE_SESSION_KEY) {
  const db = await getDb();
  if (db) {
    return db.delete("sessions", id);
  }

  const bucket = readLocalStorageScope<OfflineWorkerSession>("sessions");
  delete bucket[id];
  writeLocalStorageScope("sessions", bucket);
}

export async function putOfflineMeta<TValue>(key: string, value: TValue) {
  const db = await getDb();
  if (db) {
    return db.put("meta", { key, value, updatedAt: new Date().toISOString() });
  }

  const bucket = readLocalStorageScope<OfflineMetaEntry>("meta");
  bucket[key] = { key, value, updatedAt: new Date().toISOString() };
  writeLocalStorageScope("meta", bucket);
}

export async function getOfflineMeta<TValue>(key: string) {
  const db = await getDb();
  if (db) {
    const record = await db.get("meta", key);
    return (record?.value as TValue | undefined) ?? null;
  }

  const bucket = readLocalStorageScope<OfflineMetaEntry>("meta");
  const record = bucket[key];
  return (record?.value as TValue | undefined) ?? null;
}

export async function clearWorkerOfflineData(workerId: string) {
  const db = await getDb();
  if (!db) {
    const trustedBucket = readLocalStorageScope<TrustedWorkerDeviceRecord>("trustedDevices");
    const trustedFiltered = Object.fromEntries(Object.entries(trustedBucket).filter(([, value]) => value.workerId !== workerId));
    writeLocalStorageScope("trustedDevices", trustedFiltered);

    const sessionsBucket = readLocalStorageScope<OfflineWorkerSession>("sessions");
    const sessionsFiltered = Object.fromEntries(Object.entries(sessionsBucket).filter(([, value]) => value.workerId !== workerId));
    writeLocalStorageScope("sessions", sessionsFiltered);
    return;
  }

  const tx = db.transaction("mutations", "readwrite");
  const index = tx.store.index("by-worker");
  let cursor = await index.openCursor(workerId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  const cacheTx = db.transaction("cache", "readwrite");
  const cacheIndex = cacheTx.store.index("by-worker");
  let cacheCursor = await cacheIndex.openCursor(workerId);
  while (cacheCursor) {
    await cacheCursor.delete();
    cacheCursor = await cacheCursor.continue();
  }

  const deviceTx = db.transaction("trustedDevices", "readwrite");
  const deviceIndex = deviceTx.store.index("by-worker");
  let deviceCursor = await deviceIndex.openCursor(workerId);
  while (deviceCursor) {
    await deviceCursor.delete();
    deviceCursor = await deviceCursor.continue();
  }

  const sessionTx = db.transaction("sessions", "readwrite");
  const sessionIndex = sessionTx.store.index("by-worker");
  let sessionCursor = await sessionIndex.openCursor(workerId);
  while (sessionCursor) {
    await sessionCursor.delete();
    sessionCursor = await sessionCursor.continue();
  }

  await tx.done;
  await cacheTx.done;
  await deviceTx.done;
  await sessionTx.done;
}
