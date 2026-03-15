"use client";

import Link from "next/link";
import { CircleOff } from "lucide-react";
import { useWorkerDashboardSnapshot } from "@/hooks/use-worker-dashboard-snapshot";
import { WorkerCloseShiftForm } from "@/components/worker/worker-close-shift-form";
import type { AppSettingsRecord, WorkerDashboardSnapshot } from "@/types";

export function WorkerCloseShiftScreen({
  workerId,
  initialSnapshot,
  settings
}: {
  workerId: string;
  initialSnapshot?: WorkerDashboardSnapshot | null;
  settings?: AppSettingsRecord;
}) {
  const { snapshot, source } = useWorkerDashboardSnapshot(workerId, initialSnapshot);
  if (!snapshot) {
    return (
      <section className="rounded-[1.75rem] bg-white p-5 shadow-soft">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <CircleOff className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-950">لا توجد بيانات محلية كافية</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          افتح الرئيسية مرة واحدة بالإنترنت ليتم حفظ المناوبة والإعدادات على هذا الجهاز، وبعدها يمكن إغلاق المناوبة حتى أثناء الانقطاع.
        </p>
        <Link href="/worker/dashboard" className="mt-4 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
          العودة إلى الرئيسية
        </Link>
      </section>
    );
  }

  const activeShift = snapshot?.activeShift ?? null;

  if (!activeShift) {
    return (
      <section className="rounded-[1.75rem] bg-white p-5 shadow-soft">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <CircleOff className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-950">لا توجد مناوبة لإغلاقها</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          افتح مناوبة أولًا أو ارجع إلى الرئيسية. {source === "cache" ? "إذا كانت لديك مناوبة محلية قديمة فانتظر مزامنتها أو افتح هذه الصفحة من الجهاز نفسه." : ""}
        </p>
        <Link href="/worker/dashboard" className="mt-4 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
          العودة إلى الرئيسية
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">إغلاق المناوبة</h1>
        <p className="text-sm text-slate-500">راجع الأرقام بوضوح قبل اعتماد الإغلاق، وسيبقى الحفظ محليًا حتى لو انقطع الإنترنت.</p>
      </div>
      <WorkerCloseShiftForm
        workerId={workerId}
        shift={activeShift}
        transactions={snapshot?.activeShiftTransactions ?? []}
        settings={snapshot?.settings ?? settings!}
      />
    </div>
  );
}
