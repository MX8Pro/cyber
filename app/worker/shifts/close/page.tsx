import { WorkerCloseShiftScreen } from "@/components/worker/worker-close-shift-screen";
import { WorkerOfflineRoute } from "@/components/worker/worker-offline-route";
import { WorkerShell } from "@/components/worker/worker-shell";
import { getAppSettings, getShiftWithTransactions, getWorkerDashboard } from "@/lib/server/repositories";
import { getSessionUser } from "@/lib/server/session";
import type { WorkerDashboardSnapshot } from "@/types";

export default async function WorkerCloseActiveShiftPage() {
  const session = await getSessionUser();
  if (!session || session.role !== "worker" || !session.workerId) {
    return <WorkerOfflineRoute view="close" />;
  }

  const dashboard = await getWorkerDashboard(session.workerId!);
  const activeShiftBundle = dashboard.activeShift ? await getShiftWithTransactions(dashboard.activeShift.id, session.workerId!) : null;
  const settings = await getAppSettings();

  const snapshot: WorkerDashboardSnapshot = {
    workerId: session.workerId!,
    worker: {
      id: dashboard.worker?.id ?? session.workerId!,
      displayName: dashboard.worker?.displayName ?? "العامل",
      color: dashboard.worker?.color,
      icon: dashboard.worker?.icon
    },
    activeShift: dashboard.activeShift ?? null,
    activeShiftTransactions: activeShiftBundle?.transactions ?? [],
    recentTransactions: dashboard.recentTransactions,
    openingContext: dashboard.openingContext,
    settings,
    updatedAt: new Date().toISOString()
  };

  return (
    <WorkerShell workerName={snapshot.worker.displayName} workerId={session.workerId!}>
      <WorkerCloseShiftScreen workerId={session.workerId!} initialSnapshot={snapshot} settings={settings} />
    </WorkerShell>
  );
}
