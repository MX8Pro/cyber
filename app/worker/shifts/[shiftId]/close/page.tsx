import { WorkerCloseShiftScreen } from "@/components/worker/worker-close-shift-screen";
import { WorkerOfflineRoute } from "@/components/worker/worker-offline-route";
import { WorkerShell } from "@/components/worker/worker-shell";
import { getAppSettings, getShiftWithTransactions, getWorkerDashboard } from "@/lib/server/repositories";
import { getSessionUser } from "@/lib/server/session";
import type { WorkerDashboardSnapshot } from "@/types";

export default async function WorkerCloseShiftPage({
  params
}: {
  params: Promise<{ shiftId: string }>;
}) {
  const session = await getSessionUser();
  if (!session || session.role !== "worker" || !session.workerId) {
    return <WorkerOfflineRoute view="close" />;
  }

  const { shiftId } = await params;
  const [dashboard, bundle, settings] = await Promise.all([
    getWorkerDashboard(session.workerId!),
    getShiftWithTransactions(shiftId, session.workerId!),
    getAppSettings()
  ]);

  const snapshot: WorkerDashboardSnapshot = {
    workerId: session.workerId!,
    worker: {
      id: dashboard.worker?.id ?? session.workerId!,
      displayName: dashboard.worker?.displayName ?? "العامل",
      color: dashboard.worker?.color,
      icon: dashboard.worker?.icon
    },
    activeShift: bundle?.shift?.status === "open" ? bundle.shift : dashboard.activeShift ?? null,
    activeShiftTransactions: bundle?.shift?.status === "open" ? bundle.transactions : [],
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
