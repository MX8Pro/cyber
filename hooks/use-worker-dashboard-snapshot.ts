"use client";

import { useEffect, useState } from "react";
import { WORKER_OFFLINE_EVENT } from "@/offline/events";
import { getWorkerDashboardCache, saveWorkerDashboardCache } from "@/offline/worker-cache";
import type { WorkerDashboardSnapshot } from "@/types";

export function useWorkerDashboardSnapshot(workerId: string, initialSnapshot?: WorkerDashboardSnapshot | null) {
  const [snapshot, setSnapshot] = useState<WorkerDashboardSnapshot | null>(initialSnapshot ?? null);
  const [source, setSource] = useState<"server" | "cache" | "empty">(initialSnapshot ? "server" : "empty");

  useEffect(() => {
    let isMounted = true;

    if (initialSnapshot) {
      saveWorkerDashboardCache(initialSnapshot).catch(() => undefined);
      setSnapshot(initialSnapshot);
      setSource("server");
    }

    const loadCached = async () => {
      const cached = await getWorkerDashboardCache(workerId);
      if (!cached || !isMounted) {
        return;
      }

      if (!initialSnapshot || new Date(cached.updatedAt).getTime() > new Date(initialSnapshot.updatedAt).getTime()) {
        setSnapshot(cached);
        setSource("cache");
      }
    };

    const handleOfflineChange = (event: Event) => {
      const detail = (event as CustomEvent<{ workerId?: string }>).detail;
      if (!detail?.workerId || detail.workerId === workerId) {
        loadCached().catch(() => undefined);
      }
    };

    loadCached().catch(() => undefined);
    window.addEventListener(WORKER_OFFLINE_EVENT, handleOfflineChange as EventListener);
    return () => {
      isMounted = false;
      window.removeEventListener(WORKER_OFFLINE_EVENT, handleOfflineChange as EventListener);
    };
  }, [initialSnapshot, workerId]);

  return { snapshot, source };
}
