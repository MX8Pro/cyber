"use client";

import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { useWorkerDashboardSnapshot } from "@/hooks/use-worker-dashboard-snapshot";
import { formatCurrency } from "@/lib/utils/format";
import { calculateShiftBalances } from "@/lib/utils/shift-balances";
import { WorkerTransactionForm } from "@/components/worker/worker-transaction-form";
import type { WorkerDashboardSnapshot } from "@/types";

export function WorkerTransactionScreen({
  workerId,
  initialSnapshot
}: {
  workerId: string;
  initialSnapshot?: WorkerDashboardSnapshot | null;
}) {
  const { snapshot, source } = useWorkerDashboardSnapshot(workerId, initialSnapshot);
  if (!snapshot) {
    return (
      <section className="rounded-[1.75rem] bg-white p-5 shadow-soft">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <ReceiptText className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-950">لا توجد بيانات محلية كافية</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          افتح لوحة العامل مرة واحدة بالإنترنت ليتم حفظ المناوبة الحالية والرصيد على هذا الجهاز، وبعدها ستعمل هذه الصفحة أوفلاين بشكل طبيعي.
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
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <ReceiptText className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-950">لا توجد مناوبة مفتوحة</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          افتح مناوبة أولًا ليتم ربط العملية بها بشكل صحيح. {source === "cache" ? "إذا كنت تعمل أوفلاين فافتح المناوبة من الجهاز الحالي أولًا." : ""}
        </p>
        <Link href="/worker/shifts/open" className="mt-4 inline-flex rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white">
          الذهاب إلى استلام المناوبة
        </Link>
      </section>
    );
  }

  const balances = calculateShiftBalances(activeShift, snapshot?.activeShiftTransactions ?? []);

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-white p-5 shadow-soft">
        <h1 className="text-2xl font-bold text-slate-950">تسجيل عملية</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">واجهة سريعة جدًا لإدخال العملية أثناء العمل، مع حفظ محلي فوري عند انقطاع الإنترنت.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">المحل الآن</p>
            <p className="mt-2 text-lg font-bold text-slate-950">{formatCurrency(balances.shopCash)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">الفليكسي الآن</p>
            <p className="mt-2 text-lg font-bold text-slate-950">{formatCurrency(balances.flexyCash)}</p>
          </div>
        </div>
      </section>

      <WorkerTransactionForm workerId={workerId} shiftId={activeShift.id} />
    </div>
  );
}
