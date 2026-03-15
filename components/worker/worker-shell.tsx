"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftRight, HandCoins, Home, PlusCircle, Wifi, WifiOff } from "lucide-react";
import { LogoutButton } from "@/components/shared/logout-button";
import { useOfflineWorkerSession } from "@/hooks/use-offline-worker-session";
import { useWorkerSync } from "@/hooks/use-worker-sync";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/worker/dashboard", label: "الرئيسية", icon: Home },
  { href: "/worker/shifts/open", label: "استلام", icon: HandCoins },
  { href: "/worker/transactions/new", label: "عملية", icon: PlusCircle }
];

export function WorkerShell({
  workerName,
  workerId,
  children
}: {
  workerName: string;
  workerId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const syncState = useWorkerSync(workerId);
  const { session, isReady } = useOfflineWorkerSession();

  useEffect(() => {
    if (typeof navigator === "undefined" || navigator.onLine || !isReady) {
      return;
    }

    if (!session || session.workerId !== workerId) {
      router.replace("/worker/login");
      return;
    }
  }, [isReady, router, session, workerId]);

  const syncLabel =
    syncState.status === "online"
      ? "متصل"
      : syncState.status === "offline"
        ? "بدون إنترنت"
        : syncState.status === "syncing"
          ? "تتم المزامنة"
          : "يوجد خطأ مزامنة";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eefbf7_100%)] pb-24">
      <header className="sticky top-0 z-10 border-b border-white/70 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-xl px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">واجهة العامل</p>
              <h1 className="text-lg font-bold text-slate-900">{workerName}</h1>
            </div>
            <LogoutButton redirectTo="/worker/login" workerId={workerId} />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <div
              className={cn(
                "flex items-center justify-between rounded-[1.35rem] border px-3 py-3 text-sm shadow-sm transition",
                syncState.status === "offline"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : syncState.status === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-900"
                    : "border-emerald-100 bg-emerald-50 text-emerald-900"
              )}
            >
              <div className="flex items-center gap-2">
                {syncState.status === "offline" ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                <span className="font-semibold">{syncLabel}</span>
              </div>
              <span className="text-xs">
                {syncState.pendingCount ? `${syncState.pendingCount} عناصر بانتظار الرفع` : "كل شيء محفوظ"}
              </span>
            </div>

            <div className="flex items-center justify-center rounded-[1.35rem] bg-slate-950 px-3 py-3 text-xs font-semibold text-white">
              <ArrowLeftRight className="me-2 h-4 w-4" />
              {syncState.pendingCount ? "سيتم الرفع تلقائيًا" : "المزامنة مستقرة"}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-5">
        {syncState.status === "offline" && (!isReady || !session || session.workerId !== workerId) ? (
          <section className="rounded-[1.5rem] bg-white p-4 text-sm text-slate-500 shadow-soft">جارٍ التحقق من الجلسة المحلية...</section>
        ) : (
          children
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-3 gap-2 px-4 py-3">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl px-3 py-3 text-xs font-medium transition",
                  active ? "bg-brand text-white shadow-[0_12px_30px_-16px_rgba(13,148,136,0.9)]" : "bg-slate-100 text-slate-600"
                )}
              >
                <Icon className="mb-1 h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
