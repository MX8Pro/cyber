"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoadingShell } from "@/components/shared/loading-state";
import { WorkerCloseShiftScreen } from "@/components/worker/worker-close-shift-screen";
import { WorkerDashboardPanel } from "@/components/worker/worker-dashboard-panel";
import { WorkerOpenShiftForm } from "@/components/worker/worker-open-shift-form";
import { WorkerShell } from "@/components/worker/worker-shell";
import { WorkerTransactionScreen } from "@/components/worker/worker-transaction-screen";
import { useOfflineWorkerSession } from "@/hooks/use-offline-worker-session";
import { useWorkerDashboardSnapshot } from "@/hooks/use-worker-dashboard-snapshot";
import { DEFAULT_SHIFT_SCHEDULE, getShiftTypeForDate } from "@/lib/utils/shift-schedule";
import type { AppSettingsRecord } from "@/types";

const FALLBACK_SETTINGS: AppSettingsRecord = {
  id: "app",
  workerProfitPercentage: 50,
  shopProfitPercentage: 50,
  profitCalculationMode: "strict-flexy-separated",
  roundProfitShares: true,
  largeExpenseThreshold: 5000,
  shiftSchedule: DEFAULT_SHIFT_SCHEDULE,
  telegram: {
    enabled: false,
    chatId: "",
    botTokenMasked: null,
    notifications: [],
    updatedAt: null
  },
  updatedAt: new Date(0).toISOString()
};

export function WorkerOfflineRoute({
  view
}: {
  view: "dashboard" | "open" | "transaction" | "close";
}) {
  const router = useRouter();
  const { session, isReady } = useOfflineWorkerSession();
  const workerId = session?.workerId ?? "";
  const { snapshot } = useWorkerDashboardSnapshot(workerId);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!session) {
      router.replace("/worker/login");
      return;
    }

    if (view === "open" && snapshot?.activeShift) {
      router.replace("/worker/dashboard");
    }
  }, [isReady, router, session, snapshot?.activeShift, view]);

  if (!isReady) {
    return <PageLoadingShell title="جارٍ فتح واجهة العامل" description="نجهز آخر البيانات المحلية ونفحص صلاحية هذا الجهاز." />;
  }

  if (!session) {
    return <PageLoadingShell title="جارٍ تحويلك إلى الدخول" description="لا توجد جلسة عامل محلية صالحة على هذا الجهاز." />;
  }

  const workerName = snapshot?.worker.displayName ?? session.displayName;
  const settings = snapshot?.settings ?? FALLBACK_SETTINGS;

  const fallbackOpeningContext = {
    suggestedShiftType: getShiftTypeForDate(new Date(), settings.shiftSchedule ?? DEFAULT_SHIFT_SCHEDULE),
    handoverIsEstimated: true,
    hasOpenConflict: false
  } as const;

  return (
    <WorkerShell workerName={workerName} workerId={session.workerId}>
      {view === "dashboard" ? (
        <WorkerDashboardPanel workerId={session.workerId} />
      ) : view === "open" ? (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">استلام المناوبة</h1>
            <p className="text-sm text-slate-500">
              {snapshot?.openingContext
                ? "يمكنك البدء من النسخة المحلية المحفوظة، وسيتم الرفع إلى Firebase عند رجوع الإنترنت."
                : "لا توجد بيانات استلام محفوظة بالكامل، لكن يمكنك بدء المناوبة يدويًا وسيتم اعتمادها محليًا ثم رفعها عند رجوع الإنترنت."}
            </p>
          </div>
          <WorkerOpenShiftForm workerId={session.workerId} openingContext={snapshot?.openingContext ?? fallbackOpeningContext} />
        </div>
      ) : view === "transaction" ? (
        <WorkerTransactionScreen workerId={session.workerId} />
      ) : (
        <WorkerCloseShiftScreen workerId={session.workerId} settings={settings} />
      )}
    </WorkerShell>
  );
}
