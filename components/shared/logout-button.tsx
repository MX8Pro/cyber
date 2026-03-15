"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { countOfflineMutations } from "@/offline/db";
import { clearCurrentOfflineWorkerSession } from "@/offline/worker-auth";
import { LoadingButton } from "@/components/shared/loading-state";

export function LogoutButton({ redirectTo, workerId }: { redirectTo: string; workerId?: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <LoadingButton
      type="button"
      variant="secondary"
      className="px-4 py-2 text-sm"
      loading={isPending}
      loadingText="جارٍ تسجيل الخروج..."
      onClick={async () => {
        setIsPending(true);
        try {
          if (workerId) {
            const pendingCount = await countOfflineMutations(workerId);
            if (pendingCount > 0) {
              toast.error("لا يمكن تسجيل الخروج الآن لأن هناك عمليات محلية بانتظار الرفع.");
              return;
            }

            await clearCurrentOfflineWorkerSession();
          }

          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include"
          });

          router.replace(redirectTo);
          router.refresh();
        } finally {
          setIsPending(false);
        }
      }}
    >
      تسجيل الخروج
    </LoadingButton>
  );
}
