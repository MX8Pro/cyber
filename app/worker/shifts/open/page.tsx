import { redirect } from "next/navigation";
import { WorkerOfflineRoute } from "@/components/worker/worker-offline-route";
import { WorkerShell } from "@/components/worker/worker-shell";
import { WorkerOpenShiftForm } from "@/components/worker/worker-open-shift-form";
import { getShiftOpeningContext, getWorkerDashboard } from "@/lib/server/repositories";
import { getSessionUser } from "@/lib/server/session";

export default async function WorkerOpenShiftPage() {
  const session = await getSessionUser();
  if (!session || session.role !== "worker" || !session.workerId) {
    return <WorkerOfflineRoute view="open" />;
  }

  const [dashboard, openingContext] = await Promise.all([
    getWorkerDashboard(session.workerId!),
    getShiftOpeningContext()
  ]);

  if (dashboard.activeShift) {
    redirect("/worker/dashboard");
  }

  return (
    <WorkerShell workerName={dashboard.worker?.displayName ?? "العامل"} workerId={session.workerId!}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">استلام المناوبة</h1>
          <p className="text-sm text-slate-500">أدخل فقط ما وجدته فعليًا عند بداية الاستلام، وسيحدد النظام الفترة تلقائيًا.</p>
        </div>
        <WorkerOpenShiftForm workerId={session.workerId!} openingContext={openingContext} />
      </div>
    </WorkerShell>
  );
}
