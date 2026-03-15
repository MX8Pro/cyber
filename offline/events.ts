export const WORKER_OFFLINE_EVENT = "worker-offline-data-changed";
export const WORKER_AUTH_EVENT = "worker-offline-auth-changed";

export function emitWorkerOfflineEvent(workerId?: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(WORKER_OFFLINE_EVENT, {
      detail: { workerId }
    })
  );
}

export function emitWorkerAuthEvent(workerId?: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(WORKER_AUTH_EVENT, {
      detail: { workerId }
    })
  );
}
