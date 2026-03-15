"use client";

import { useEffect, useState } from "react";
import { countOfflineMutations } from "@/offline/db";
import { WORKER_OFFLINE_EVENT } from "@/offline/events";
import {
  getCurrentOfflineWorkerSession,
  restoreServerSessionFromOfflineSession
} from "@/offline/worker-auth";
import { syncOfflineMutations } from "@/offline/sync-queue";

export function useWorkerSync(workerId: string) {
  const [state, setState] = useState<{
    status: "online" | "offline" | "syncing" | "error";
    pendingCount: number;
    lastSyncedAt?: string;
    sessionRestoredAt?: string;
  }>({
    status: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online",
    pendingCount: 0
  });

  useEffect(() => {
    let isMounted = true;

    const refreshPendingCount = async () => {
      const pendingCount = await countOfflineMutations(workerId);
      if (!isMounted) {
        return pendingCount;
      }

      setState((current) => ({ ...current, pendingCount }));
      return pendingCount;
    };

    const restoreSessionIfNeeded = async () => {
      const offlineSession = await getCurrentOfflineWorkerSession();
      if (!offlineSession || offlineSession.workerId !== workerId) {
        return false;
      }

      await restoreServerSessionFromOfflineSession(offlineSession);
      if (!isMounted) {
        return true;
      }

      setState((current) => ({
        ...current,
        sessionRestoredAt: new Date().toISOString()
      }));
      return true;
    };

    const syncNow = async () => {
      if (typeof navigator === "undefined" || !navigator.onLine) {
        setState((current) => ({ ...current, status: "offline" }));
        return;
      }

      setState((current) => ({ ...current, status: "syncing" }));

      try {
        await restoreSessionIfNeeded();
        const pendingCount = await refreshPendingCount();
        if (!pendingCount) {
          setState((current) => ({ ...current, status: "online" }));
          return;
        }

        const result = await syncOfflineMutations(workerId);
        const nextPendingCount = await refreshPendingCount();
        setState((current) => ({
          ...current,
          status: "online",
          pendingCount: nextPendingCount,
          lastSyncedAt: result.synced ? new Date().toISOString() : current.lastSyncedAt
        }));
      } catch {
        await refreshPendingCount();
        setState((current) => ({ ...current, status: "error" }));
      }
    };

    const markOffline = () => setState((current) => ({ ...current, status: "offline" }));
    const handleOfflineChange = (event: Event) => {
      const detail = (event as CustomEvent<{ workerId?: string }>).detail;
      if (!detail?.workerId || detail.workerId === workerId) {
        refreshPendingCount().catch(() => undefined);
      }
    };

    refreshPendingCount().catch(() => undefined);
    syncNow();
    window.addEventListener("online", syncNow);
    window.addEventListener("offline", markOffline);
    window.addEventListener(WORKER_OFFLINE_EVENT, handleOfflineChange as EventListener);
    return () => {
      isMounted = false;
      window.removeEventListener("online", syncNow);
      window.removeEventListener("offline", markOffline);
      window.removeEventListener(WORKER_OFFLINE_EVENT, handleOfflineChange as EventListener);
    };
  }, [workerId]);

  return state;
}
