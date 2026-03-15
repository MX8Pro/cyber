"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, Clock3, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkerDashboardSnapshot } from "@/hooks/use-worker-dashboard-snapshot";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatShiftStatus, formatShiftType } from "@/lib/utils/format";
import { calculateShiftBalances } from "@/lib/utils/shift-balances";
import type { TransactionRecord, WorkerDashboardSnapshot } from "@/types";

export function WorkerDashboardPanel({
  workerId,
  initialSnapshot
}: {
  workerId: string;
  initialSnapshot?: WorkerDashboardSnapshot | null;
}) {
  const router = useRouter();
  const { snapshot, source } = useWorkerDashboardSnapshot(workerId, initialSnapshot);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.onLine) {
      return;
    }

    router.prefetch("/worker/dashboard");
    router.prefetch("/worker/shifts/open");
    router.prefetch("/worker/transactions/new");
    router.prefetch("/worker/shifts/close");
  }, [router]);

  if (!snapshot) {
    return (
      <section className="rounded-[1.75rem] bg-white p-5 text-sm leading-7 text-slate-600 shadow-soft">
        لا توجد بيانات عامل محفوظة محليًا بعد. ادخل مرة واحدة بالإنترنت ثم افتح الرئيسية ليتم حفظ الحالة على هذا الجهاز.
      </section>
    );
  }

  const activeShift = snapshot?.activeShift ?? null;
  const openingContext = snapshot?.openingContext ?? null;
  const recentTransactions = snapshot?.recentTransactions ?? [];
  const balances = calculateShiftBalances(activeShift, snapshot?.activeShiftTransactions ?? []);
  const shopBalance = activeShift ? balances.shopCash : 0;
  const flexyBalance = activeShift ? balances.flexyCash : 0;

  const sourceLabel = useMemo(() => {
    if (source === "cache") {
      return "أنت ترى آخر نسخة محفوظة محليًا إلى حين عودة الاتصال.";
    }

    return "الواجهة جاهزة للعمل اليومي مع تحديث سريع وواضح.";
  }, [source]);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_90%)] p-5 text-white shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-200">وضعك الحالي</p>
            <h2 className="mt-2 text-2xl font-bold">{activeShift ? "لديك مناوبة مفتوحة" : "جاهز لاستلام مناوبة جديدة"}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-200">
              {activeShift ? `المناوبة الحالية: ${formatShiftType(activeShift.shiftType)}` : sourceLabel}
            </p>
          </div>

          <div className="rounded-[1.35rem] bg-white/10 px-4 py-3 text-sm">
            <p className="text-slate-200">آخر تحديث</p>
            <p className="mt-1 font-semibold text-white">{new Date(snapshot?.updatedAt ?? new Date().toISOString()).toLocaleTimeString("fr-FR")}</p>
          </div>
        </div>
      </section>

      {source === "cache" ? (
        <section className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
            <p>تعمل الآن على آخر نسخة محفوظة محليًا. يمكنك متابعة العمل، وسيتم رفع التغييرات إلى Firebase عند عودة الإنترنت.</p>
          </div>
        </section>
      ) : null}

      {!activeShift && openingContext?.previousShiftId ? (
        <section
          className={`rounded-[1.75rem] p-5 shadow-soft ${
            openingContext.hasOpenConflict ? "border border-amber-200 bg-amber-50" : "bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">آخر ما تركه العامل السابق</p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">{openingContext.previousWorkerName ?? "غير معروف"}</h3>
              <p className="mt-1 text-sm text-slate-500">
                الحالة: {formatShiftStatus(openingContext.previousShiftStatus ?? "open")}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                openingContext.handoverIsEstimated ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {openingContext.handoverIsEstimated ? "رصيد تقديري" : "رصيد مؤكد"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric title="أموال المحل" value={formatCurrency(openingContext.handoverShopCash ?? 0)} />
            <Metric title="أموال الفليكسي" value={formatCurrency(openingContext.handoverFlexyCash ?? 0)} />
          </div>

          {openingContext.hasOpenConflict ? (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm leading-7 text-amber-900">
              <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
              <p>المناوبة السابقة لم تُغلق نهائيًا. سيحوّلها النظام إلى مراجعة ويبلغ الإدارة مباشرة عند بدء مناوبتك.</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <Metric title="أموال المحل" value={formatCurrency(shopBalance)} />
        <Metric title="أموال الفليكسي" value={formatCurrency(flexyBalance)} />
      </div>

      <div className="grid gap-3">
        <ActionLink href="/worker/shifts/open" variant="primary">
          استلام المناوبة
        </ActionLink>
        <ActionLink href="/worker/transactions/new" variant="secondary">
          تسجيل عملية
        </ActionLink>
        {activeShift ? (
          <ActionLink href="/worker/shifts/close" variant="danger">
            إغلاق المناوبة
          </ActionLink>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-5 py-4 text-center text-sm text-slate-500">
            افتح مناوبة أولًا ليظهر لك خيار الإغلاق.
          </div>
        )}
      </div>

      <section className="rounded-[2rem] bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">آخر العمليات</h2>
            <p className="text-sm text-slate-500">آخر 5 عمليات فقط لسهولة المتابعة</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
            <Clock3 className="me-1 inline-flex h-3.5 w-3.5" />
            {recentTransactions.length} عمليات
          </div>
        </div>

        <div className="space-y-3">
          {recentTransactions.length ? (
            recentTransactions.map((transaction) => <TransactionItem key={transaction.id} transaction={transaction} />)
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              لا توجد عمليات حديثة بعد.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <section className="rounded-[1.75rem] bg-white p-4 shadow-soft">
      <div className="flex items-center gap-2 text-slate-500">
        <WalletCards className="h-4 w-4 text-brand" />
        <p className="text-sm">{title}</p>
      </div>
      <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
    </section>
  );
}

function ActionLink({
  href,
  variant,
  children
}: {
  href: string;
  variant: "primary" | "secondary" | "danger";
  children: React.ReactNode;
}) {
  const className =
    variant === "primary"
      ? "bg-brand text-white shadow-[0_20px_40px_-25px_rgba(13,148,136,0.95)]"
      : variant === "danger"
        ? "bg-rose-600 text-white shadow-[0_20px_40px_-25px_rgba(225,29,72,0.75)]"
        : "bg-white text-slate-900 shadow-soft";

  return (
    <Link href={href} className={cn("rounded-[1.5rem] px-5 py-4 text-center text-base font-semibold transition hover:-translate-y-0.5", className)}>
      {children}
    </Link>
  );
}

function TransactionItem({ transaction }: { transaction: TransactionRecord }) {
  return (
    <div className="rounded-[1.5rem] bg-slate-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-900">{transaction.description || "عملية مالية"}</p>
        <p className="text-sm font-semibold text-slate-700">{formatCurrency(transaction.amount)}</p>
      </div>
      <div className="mt-1 flex items-center justify-between text-sm text-slate-500">
        <span>{transaction.treasury === "shop" ? "المحل" : "الفليكسي"}</span>
        <span>{new Date(transaction.createdAt).toLocaleTimeString("fr-FR")}</span>
      </div>
    </div>
  );
}
