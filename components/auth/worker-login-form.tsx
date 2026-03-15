"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, KeyRound, ShieldCheck, UsersRound, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoadingButton, SkeletonBlock } from "@/components/shared/loading-state";
import { useOfflineWorkerSession } from "@/hooks/use-offline-worker-session";
import { cn } from "@/lib/utils/cn";
import { workerLoginSchema, type WorkerLoginInput } from "@/lib/validators/auth";
import {
  getOfflineTrustedWorkerList,
  getOrCreateBrowserId,
  registerTrustedWorkerDevice,
  unlockOfflineWorkerSession
} from "@/offline/worker-auth";
import { getWorkerLoginListCache, saveWorkerLoginListCache } from "@/offline/worker-cache";
import type { TrustedWorkerDevicePayload, WorkerListItem } from "@/types";

interface WorkerLoginResponse {
  ok: true;
  worker: WorkerListItem;
  trustedDevice: TrustedWorkerDevicePayload | null;
}

export function WorkerLoginForm() {
  const router = useRouter();
  const { session, isReady } = useOfflineWorkerSession();
  const [workers, setWorkers] = useState<WorkerListItem[]>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(true);
  const [workersSource, setWorkersSource] = useState<"live" | "trusted" | "cache" | "empty">("empty");
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  const form = useForm<WorkerLoginInput>({
    resolver: zodResolver(workerLoginSchema),
    defaultValues: {
      workerId: "",
      password: ""
    }
  });

  const watchedWorkerId = form.watch("workerId");
  const selectedWorker = useMemo(() => workers.find((worker) => worker.id === watchedWorkerId) ?? null, [workers, watchedWorkerId]);

  useEffect(() => {
    if (!isReady || !session) {
      return;
    }

    router.replace("/worker/dashboard");
  }, [isReady, router, session]);

  useEffect(() => {
    let isMounted = true;

    const selectFirstWorker = (items: WorkerListItem[]) => {
      if (!items.length) {
        return;
      }

      const currentWorkerId = form.getValues("workerId");
      const nextWorkerId = items.some((worker) => worker.id === currentWorkerId) ? currentWorkerId : items[0].id;
      form.setValue("workerId", nextWorkerId, { shouldValidate: true, shouldDirty: true });
    };

    const loadWorkers = async () => {
      setIsLoadingWorkers(true);
      const trustedWorkers = await getOfflineTrustedWorkerList();
      const cachedWorkers = (await getWorkerLoginListCache()) ?? [];

      if (!navigator.onLine) {
        if (!isMounted) {
          return;
        }

        const offlineWorkers = trustedWorkers.length ? trustedWorkers : cachedWorkers;
        setWorkers(offlineWorkers);
        setWorkersSource(trustedWorkers.length ? "trusted" : offlineWorkers.length ? "cache" : "empty");
        selectFirstWorker(offlineWorkers);
        setIsLoadingWorkers(false);
        return;
      }

      try {
        const response = await fetch("/api/public/workers", { cache: "no-store" });
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "تعذر تحميل قائمة العمال");
        }

        const data = (await response.json()) as { workers?: WorkerListItem[] };
        const nextWorkers = data.workers ?? [];
        if (!isMounted) {
          return;
        }

        setWorkers(nextWorkers);
        setWorkersSource("live");
        selectFirstWorker(nextWorkers);
        await saveWorkerLoginListCache(nextWorkers);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const fallbackWorkers = trustedWorkers.length ? trustedWorkers : cachedWorkers;
        setWorkers(fallbackWorkers);
        setWorkersSource(trustedWorkers.length ? "trusted" : fallbackWorkers.length ? "cache" : "empty");
        selectFirstWorker(fallbackWorkers);
        toast.error(error instanceof Error ? error.message : "تعذر تحميل قائمة العمال");
      } finally {
        if (isMounted) {
          setIsLoadingWorkers(false);
        }
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      loadWorkers().catch(() => undefined);
    };

    const handleOffline = () => {
      setIsOnline(false);
      loadWorkers().catch(() => undefined);
    };

    loadWorkers().catch(() => undefined);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [form]);

  const onValidSubmit = form.handleSubmit(
    async (values) => {
      if (!navigator.onLine) {
        try {
          await unlockOfflineWorkerSession(values.workerId, values.password);
          toast.success("تم فتح العامل محليًا بدون إنترنت");
          router.replace("/worker/dashboard");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "تعذر الدخول المحلي");
        }
        return;
      }

      try {
        const browserId = await getOrCreateBrowserId();
        const response = await fetch("/api/auth/worker/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...values,
            browserId
          })
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "تعذر تسجيل الدخول");
        }

        const data = (await response.json()) as WorkerLoginResponse;
        let offlineActivationReady = false;
        let offlineActivationError: string | null = null;

        if (data.trustedDevice) {
          try {
            await registerTrustedWorkerDevice({
              worker: data.worker,
              payload: data.trustedDevice,
              password: values.password
            });
            await unlockOfflineWorkerSession(values.workerId, values.password);
            offlineActivationReady = true;
          } catch (error) {
            offlineActivationReady = false;
            offlineActivationError = error instanceof Error ? error.message : "فشل حفظ التفعيل المحلي";
          }
        }

        toast.success(
          offlineActivationReady
            ? "تم تسجيل الدخول وتفعيل هذا الجهاز للعمل بدون إنترنت"
            : `تم تسجيل الدخول، لكن التفعيل المحلي لم يكتمل: ${offlineActivationError ?? "تحقق من صلاحية التخزين المحلي في المتصفح"}`
        );

        window.location.assign("/worker/dashboard");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "تعذر تسجيل الدخول");
      }
    },
    (errors) => {
      const firstError =
        errors.workerId?.message ||
        errors.password?.message ||
        "تحقق من اسم العامل وكلمة السر ثم أعد المحاولة";

      toast.error(firstError);
    }
  );

  return (
    <div className="glass-panel surface-glow rise-in overflow-hidden p-4 sm:p-5 lg:p-6">
      <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_100%)] p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <UsersRound className="h-4 w-4" />
              <span>دخول العامل</span>
            </div>

            <h2 className="text-2xl font-bold">اختر اسمك ثم أدخل كلمة السر</h2>

            <p className="text-sm leading-7 text-slate-200">
              بعد أول دخول ناجح بالإنترنت، يتم تفعيل هذا الجهاز للعمل بدون إنترنت على نفس المتصفح. لاحقًا يمكن متابعة المناوبة والعمليات محليًا ثم تتم المزامنة تلقائيًا عند عودة الاتصال.
            </p>
          </div>

          <div
            className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] text-lg font-bold text-white soft-ring"
            style={{ backgroundColor: selectedWorker?.color || "#0f766e" }}
          >
            {(selectedWorker?.icon || selectedWorker?.displayName?.slice(0, 1) || "?").slice(0, 2)}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1",
              isOnline ? "bg-emerald-500/20 text-emerald-100" : "bg-amber-500/20 text-amber-100"
            )}
          >
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isOnline ? "الاتصال متاح" : "بدون إنترنت"}
          </span>

          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-slate-100">
            {workersSource === "live"
              ? "القائمة المباشرة من Firebase"
              : workersSource === "trusted"
                ? "العمال المفعّلون محليًا فقط"
                : workersSource === "cache"
                  ? "آخر قائمة محفوظة على هذا الجهاز"
                  : "لا توجد قائمة محفوظة بعد"}
          </span>
        </div>
      </div>

      <form onSubmit={onValidSubmit} className="mt-5 space-y-5 lg:space-y-6" noValidate>
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-slate-900">
            <UsersRound className="h-4 w-4 text-brand" />
            <label className="font-semibold">اختر اسمك</label>
          </div>

          {isLoadingWorkers ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
            </div>
          ) : workers.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {workers.map((worker) => {
                const selected = watchedWorkerId === worker.id;

                return (
                  <button
                    type="button"
                    key={worker.id}
                    onClick={() => form.setValue("workerId", worker.id, { shouldValidate: true, shouldDirty: true })}
                    className={cn(
                      "group relative overflow-hidden rounded-[1.5rem] border p-4 text-right transition duration-200",
                      selected
                        ? "border-brand bg-teal-50 shadow-[0_18px_40px_-28px_rgba(13,148,136,0.85)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-[1rem] text-base font-bold text-white transition group-hover:scale-105"
                        style={{ backgroundColor: worker.color || "#0f766e" }}
                      >
                        {(worker.icon || worker.displayName.slice(0, 1)).slice(0, 2)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{worker.displayName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {workersSource === "trusted" && !isOnline ? "يمكن فتح هذا العامل محليًا" : "جاهز للدخول"}
                        </p>
                      </div>

                      {selected ? <CheckCircle2 className="h-5 w-5 text-brand" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
              لا توجد أسماء متاحة الآن. يجب تسجيل دخول العامل مرة واحدة بالإنترنت على هذا الجهاز قبل أن يعمل الدخول الأوفلاين.
            </div>
          )}

          {form.formState.errors.workerId?.message ? (
            <p className="mt-3 text-sm font-medium text-rose-600">{form.formState.errors.workerId.message}</p>
          ) : null}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-slate-900">
            <KeyRound className="h-4 w-4 text-brand" />
            <label className="font-semibold">كلمة السر</label>
          </div>

          <input
            type="password"
            dir="ltr"
            autoComplete="current-password"
            className="field-input"
            placeholder="أدخل كلمة السر الخاصة بك"
            {...form.register("password")}
          />

          {form.formState.errors.password?.message ? (
            <p className="mt-3 text-sm font-medium text-rose-600">{form.formState.errors.password.message}</p>
          ) : null}

          <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {selectedWorker ? (
              <span>
                العامل المختار الآن: <span className="font-semibold text-slate-900">{selectedWorker.displayName}</span>
              </span>
            ) : (
              <span>اختر اسم العامل أولًا ليصبح الدخول أوضح وأسهل.</span>
            )}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-brand" />
            <p>يتم حفظ تفعيل محلي لهذا الجهاز داخل المتصفح لتشغيل وضع الأوفلاين. إذا مسحت بيانات المتصفح أو استخدمت متصفحًا آخر ستحتاج إعادة التفعيل بالإنترنت.</p>
          </div>
        </section>

        <LoadingButton
          type="submit"
          loading={form.formState.isSubmitting || isLoadingWorkers}
          loadingText={isLoadingWorkers ? "جارٍ تحميل العمال..." : isOnline ? "جارٍ تسجيل الدخول..." : "جارٍ فتح العامل محليًا..."}
          className="w-full py-4 text-base"
          disabled={!workers.length}
        >
          {isOnline ? "دخول إلى واجهة العامل" : "فتح العامل محليًا"}
        </LoadingButton>
      </form>
    </div>
  );
}
