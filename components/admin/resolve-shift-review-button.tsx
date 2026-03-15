"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-state";

export function ResolveShiftReviewButton({ shiftId }: { shiftId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function resolveReview() {
    setIsPending(true);
    try {
      const response = await fetch(`/api/admin/shifts/${shiftId}/resolve-review`, {
        method: "POST",
        credentials: "include"
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "تعذر إنهاء المراجعة");
        return;
      }

      toast.success("تم تعليم المناوبة كمراجعة مكتملة");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <LoadingButton
      type="button"
      variant="secondary"
      loading={isPending}
      loadingText="جارٍ التحديث..."
      onClick={resolveReview}
      className="text-sm"
    >
      تعليم كمراجعة مكتملة
    </LoadingButton>
  );
}
