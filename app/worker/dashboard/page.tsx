import { WorkerDashboardPanel } from "@/components/worker/worker-dashboard-panel";
import { WorkerOfflineRoute } from "@/components/worker/worker-offline-route";
import { WorkerShell } from "@/components/worker/worker-shell";
import { getAppSettings, getShiftWithTransactions, getWorkerDashboard } from "@/lib/server/repositories";
import { getSessionUser } from "@/lib/server/session";
import type { WorkerDashboardSnapshot } from "@/types";

export default async function WorkerDashboardPage() {
  const session = await getSessionUser();
  if (!session || session.role !== "worker" || !session.workerId) {
    return <WorkerOfflineRoute view="dashboard" />;
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
      <WorkerDashboardPanel workerId={session.workerId!} initialSnapshot={snapshot} />
    </WorkerShell>
  );
}
