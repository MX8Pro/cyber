"use client";

import { useEffect, useState } from "react";
import { getCurrentOfflineWorkerSession } from "@/offline/worker-auth";
import { WORKER_AUTH_EVENT } from "@/offline/events";
import type { OfflineWorkerSession } from "@/types";

export function useOfflineWorkerSession() {
  const [session, setSession] = useState<OfflineWorkerSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const nextSession = await getCurrentOfflineWorkerSession();
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setIsReady(true);
    };

    const handleAuthChange = () => {
      load().catch(() => undefined);
    };

    load().catch(() => {
      if (isMounted) {
        setIsReady(true);
      }
    });
    window.addEventListener(WORKER_AUTH_EVENT, handleAuthChange as EventListener);
    return () => {
      isMounted = false;
      window.removeEventListener(WORKER_AUTH_EVENT, handleAuthChange as EventListener);
    };
  }, []);

  return { session, isReady };
}
