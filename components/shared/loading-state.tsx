"use client";

import type { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("h-4 w-4 animate-spin text-current", className)} aria-hidden="true" />;
}

export function LoadingButton({
  loading,
  children,
  loadingText,
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const variantClassName =
    variant === "secondary"
      ? "btn-secondary"
      : variant === "danger"
        ? "inline-flex items-center justify-center rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        : "btn-primary";

  return (
    <button {...props} disabled={loading || props.disabled} className={cn(variantClassName, "group relative gap-2 overflow-hidden", className)}>
      <span className="button-sheen absolute inset-0 opacity-0 transition group-hover:opacity-100" />
      {loading ? <Spinner className="h-4 w-4" /> : null}
      <span>{loading ? loadingText ?? "جارٍ التنفيذ..." : children}</span>
    </button>
  );
}

export function SkeletonBlock({
  className,
  shimmer = true
}: {
  className?: string;
  shimmer?: boolean;
}) {
  return <div aria-hidden="true" className={cn("rounded-2xl bg-slate-200/80", shimmer && "skeleton-wave", className)} />;
}

export function PageLoadingShell({
  title = "جارٍ تجهيز الصفحة",
  description = "نجهز البيانات الأساسية بسرعة ثم نعرض لك الواجهة مباشرة."
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-panel rise-in relative w-full max-w-2xl overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(13,148,136,0.14),transparent_60%)]" />

        <div className="relative space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
            <Spinner className="h-4 w-4" />
            <span>يرجى الانتظار</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
            <p className="text-sm leading-7 text-slate-500">{description}</p>
          </div>

          <div className="space-y-3">
            <SkeletonBlock className="h-20" />
            <div className="grid grid-cols-2 gap-3">
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
            </div>
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
